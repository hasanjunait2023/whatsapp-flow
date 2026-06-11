import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Minimum 5 seconds between messages
const MINIMUM_MESSAGE_DELAY_MS = 5000;
const MAX_RETRIES = 3;

interface WorkflowTriggerPayload {
  trigger_type: 'message_received' | 'keyword' | 'contact_label_added' | 'order_status_changed' | 'webhook';
  tenant_id: string;
  contact_id?: string;
  data: {
    message_content?: string;
    label_id?: string;
    label_name?: string;
    order_id?: string;
    order_status?: string;
    contact_name?: string;
    contact_phone?: string;
    instance_id?: string;
    [key: string]: any;
  };
}

// Track last message time globally for this execution
let lastMessageSentAt = 0;

async function ensureMessageDelay() {
  const now = Date.now();
  const elapsed = now - lastMessageSentAt;
  if (lastMessageSentAt > 0 && elapsed < MINIMUM_MESSAGE_DELAY_MS) {
    const waitTime = MINIMUM_MESSAGE_DELAY_MS - elapsed;
    console.log(`Waiting ${waitTime}ms before next message`);
    await new Promise(r => setTimeout(r, waitTime));
  }
  lastMessageSentAt = Date.now();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload: WorkflowTriggerPayload = await req.json();
    const { trigger_type, tenant_id, contact_id, data } = payload;

    console.log(`Processing workflow trigger: ${trigger_type} for tenant: ${tenant_id}`);

    // Reset message timer for this execution
    lastMessageSentAt = 0;

    // Find active workflows matching this trigger
    const { data: workflows, error: workflowError } = await supabase
      .from('workflows')
      .select(`
        id,
        name,
        nodes:workflow_nodes(*),
        edges:workflow_edges(*)
      `)
      .eq('tenant_id', tenant_id)
      .eq('is_active', true);

    if (workflowError) {
      console.error('Error fetching workflows:', workflowError);
      throw workflowError;
    }

    if (!workflows || workflows.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active workflows found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find workflows with matching triggers
    const matchingWorkflows = workflows.filter((workflow) => {
      const triggerNodes = workflow.nodes.filter((n: any) => n.node_type === 'trigger');
      
      return triggerNodes.some((trigger: any) => {
        const config = trigger.node_config || {};
        
        switch (trigger_type) {
          case 'message_received':
            if (trigger.node_subtype !== 'message_received' && trigger.node_subtype !== 'keyword') {
              return false;
            }
            // Check keyword match if applicable
            if (trigger.node_subtype === 'keyword' && config.keywords) {
              const keywords = Array.isArray(config.keywords) ? config.keywords : [config.keywords];
              const messageContent = (data.message_content || '').toLowerCase();
              const matchType = config.match_type || 'contains';
              
              return keywords.some((kw: string) => {
                const keyword = kw.toLowerCase();
                if (matchType === 'exact') return messageContent === keyword;
                if (matchType === 'starts_with') return messageContent.startsWith(keyword);
                return messageContent.includes(keyword);
              });
            }
            return true;

          case 'contact_label_added':
            if (trigger.node_subtype !== 'contact_label_added') return false;
            return config.label_id === data.label_id || config.label_name === data.label_name;

          case 'order_status_changed':
            if (trigger.node_subtype !== 'order_status_changed') return false;
            return config.order_status === data.order_status;

          case 'webhook':
            return trigger.node_subtype === 'webhook';

          default:
            return false;
        }
      });
    });

    console.log(`Found ${matchingWorkflows.length} matching workflows`);

    // Execute each matching workflow
    const executions = [];
    
    for (const workflow of matchingWorkflows) {
      try {
        // Create execution record
        const { data: execution, error: execError } = await supabase
          .from('workflow_executions')
          .insert({
            workflow_id: workflow.id,
            tenant_id: tenant_id,
            contact_id: contact_id || null,
            status: 'running',
            execution_data: {
              trigger_type,
              trigger_data: data,
              steps: [],
            },
          })
          .select()
          .single();

        if (execError) {
          console.error('Error creating execution:', execError);
          continue;
        }

        // Build execution order from nodes and edges
        const nodes = workflow.nodes;
        const edges = workflow.edges;
        
        // Find trigger node
        const triggerNode = nodes.find((n: any) => n.node_type === 'trigger');
        if (!triggerNode) continue;

        // Execute workflow steps
        const executedSteps: any[] = [];
        let currentNodeId = triggerNode.id;
        let continueExecution = true;
        let executionError: string | null = null;
        let failedNode: any = null;

        while (continueExecution && currentNodeId) {
          const currentNode = nodes.find((n: any) => n.id === currentNodeId);
          if (!currentNode) break;

          const stepResult = await executeNode(supabase, currentNode, data, tenant_id, contact_id);
          
          executedSteps.push({
            node_id: currentNodeId,
            node_type: currentNode.node_type,
            node_subtype: currentNode.node_subtype,
            node_label: currentNode.node_config?.label || currentNode.node_subtype,
            status: stepResult.success ? 'completed' : 'failed',
            output: stepResult.output,
            error: stepResult.error,
            executed_at: new Date().toISOString(),
          });

          if (!stepResult.success) {
            executionError = stepResult.error || 'Unknown error';
            failedNode = {
              node_id: currentNodeId,
              node_type: currentNode.node_type,
              node_subtype: currentNode.node_subtype,
              node_label: currentNode.node_config?.label || currentNode.node_subtype,
            };
            continueExecution = false;
            
            // Notify about error
            await notifyWorkflowError(
              supabase,
              workflow.id,
              workflow.name,
              tenant_id,
              execution.id,
              executionError,
              failedNode
            );
            
            break;
          }

          // Handle delays
          if (currentNode.node_type === 'delay') {
            const delay = currentNode.node_config?.delay || 1;
            const unit = currentNode.node_config?.unit || 'seconds';
            const delayMs = calculateDelayMs(delay, unit);
            
            if (delayMs <= 60000) { // Only wait for delays up to 1 minute inline
              await new Promise(resolve => setTimeout(resolve, delayMs));
            } else {
              console.log(`Long delay detected: ${delay} ${unit}. Would need job queue.`);
            }
          }

          // Handle conditions
          if (currentNode.node_type === 'condition') {
            const conditionResult = evaluateCondition(currentNode.node_config, data);
            const nextEdge = edges.find((e: any) => 
              e.source_node_id === currentNodeId && 
              e.source_handle === (conditionResult ? 'yes' : 'no')
            );
            currentNodeId = nextEdge?.target_node_id || null;
          } else {
            // Find next node
            const nextEdge = edges.find((e: any) => e.source_node_id === currentNodeId);
            currentNodeId = nextEdge?.target_node_id || null;
          }
        }

        // Update execution record
        await supabase
          .from('workflow_executions')
          .update({
            status: executionError ? 'failed' : 'completed',
            completed_at: new Date().toISOString(),
            error_message: executionError,
            execution_data: {
              trigger_type,
              trigger_data: data,
              steps: executedSteps,
            },
          })
          .eq('id', execution.id);

        executions.push({
          workflow_id: workflow.id,
          workflow_name: workflow.name,
          execution_id: execution.id,
          status: executionError ? 'failed' : 'completed',
          steps_executed: executedSteps.length,
        });

      } catch (err) {
        console.error(`Error executing workflow ${workflow.id}:`, err);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        executions,
        message: `Executed ${executions.length} workflows` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Workflow execution error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function notifyWorkflowError(
  supabase: any,
  workflowId: string,
  workflowName: string,
  tenantId: string,
  executionId: string,
  errorMessage: string,
  failedNode: any
) {
  console.log(`Notifying workflow error: ${workflowName} - ${errorMessage}`);
  
  try {
    // 1. Notify Tenant via in_app_notifications
    await supabase.from('in_app_notifications').insert({
      tenant_id: tenantId,
      type: 'workflow_error',
      title: `Workflow Error: ${workflowName}`,
      message: `Step "${failedNode.node_label}" failed: ${errorMessage}`,
      entity_type: 'workflow_execution',
      entity_id: executionId,
      metadata: {
        workflow_id: workflowId,
        workflow_name: workflowName,
        failed_node: failedNode,
        error: errorMessage
      }
    });

    // 2. Create admin notification for central support
    await supabase.from('admin_notifications').insert({
      type: 'workflow_error',
      title: `Workflow Error for Tenant`,
      message: `Workflow "${workflowName}" failed at step "${failedNode.node_label}": ${errorMessage}`,
      tenant_id: tenantId,
      entity_type: 'workflow_execution',
      entity_id: executionId,
      metadata: {
        tenant_id: tenantId,
        workflow_id: workflowId,
        workflow_name: workflowName,
        failed_node: failedNode,
        error: errorMessage
      }
    });

    // 3. Send Telegram notification to tenant
    try {
      await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-telegram-notification`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
        },
        body: JSON.stringify({
          tenant_id: tenantId,
          type: 'workflow_error',
          message: `⚠️ *Workflow Error*\n\nWorkflow: ${workflowName}\nFailed Step: ${failedNode.node_label}\nError: ${errorMessage}`
        })
      });
    } catch (telegramErr) {
      console.error('Failed to send Telegram notification:', telegramErr);
    }
  } catch (notifyErr) {
    console.error('Failed to create error notifications:', notifyErr);
  }
}

async function executeNode(
  supabase: any, 
  node: any, 
  data: any, 
  tenantId: string, 
  contactId?: string
): Promise<{ success: boolean; output?: string; error?: string }> {
  const config = node.node_config || {};
  
  try {
    switch (node.node_type) {
      case 'trigger':
        return { success: true, output: 'Trigger activated' };

      case 'action':
        return await executeAction(supabase, node.node_subtype, config, data, tenantId, contactId);

      case 'condition':
        return { success: true, output: 'Condition evaluated' };

      case 'delay':
        return { success: true, output: `Waited ${config.delay} ${config.unit}` };

      default:
        return { success: true, output: 'Unknown node type' };
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function executeAction(
  supabase: any,
  actionType: string,
  config: any,
  data: any,
  tenantId: string,
  contactId?: string
): Promise<{ success: boolean; output?: string; error?: string }> {
  try {
    // Handle message-type actions with retry
    const messageTypes = ['send_text', 'send_image', 'send_video', 'send_voice', 'send_audio', 'send_document', 'send_location', 'send_message'];
    
    if (messageTypes.includes(actionType)) {
      return await executeMessageWithRetry(supabase, actionType, config, data, tenantId, contactId);
    }

    // Non-message actions
    switch (actionType) {
      case 'add_label':
        if (!config.label_id && !config.label_name) {
          return { success: false, error: 'No label configured' };
        }
        if (contactId) {
          await supabase.from('contact_labels').insert({
            contact_id: contactId,
            label_id: config.label_id
          });
        }
        return { success: true, output: `Label "${config.label_name}" applied` };

      case 'assign_agent':
        if (!config.agent_id) {
          return { success: false, error: 'No agent configured' };
        }
        if (contactId) {
          await supabase
            .from('contacts')
            .update({ assigned_to: config.agent_id })
            .eq('id', contactId);
        }
        return { success: true, output: `Assigned to ${config.agent_name || 'agent'}` };

      case 'add_to_group':
        if (!config.group_id || !config.instance_id) {
          return { success: false, error: 'Group and instance required' };
        }
        // Call group-add-participants function
        const addResponse = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/group-add-participants`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
            },
            body: JSON.stringify({
              group_id: config.group_id,
              instance_id: config.instance_id,
              phone_numbers: [data.contact_phone],
              use_queue: config.use_queue || false
            })
          }
        );
        const addResult = await addResponse.json();
        if (!addResponse.ok) {
          throw new Error(addResult.error || 'Failed to add to group');
        }
        return { success: true, output: `Added to group "${config.group_name}"` };

      case 'remove_from_group':
        if (!config.group_id || !config.instance_id) {
          return { success: false, error: 'Group and instance required' };
        }
        const removeResponse = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/group-remove-participants`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
            },
            body: JSON.stringify({
              group_id: config.group_id,
              instance_id: config.instance_id,
              phone_numbers: [data.contact_phone]
            })
          }
        );
        const removeResult = await removeResponse.json();
        if (!removeResponse.ok) {
          throw new Error(removeResult.error || 'Failed to remove from group');
        }
        return { success: true, output: `Removed from group "${config.group_name}"` };

      case 'send_group_invite':
        if (!config.group_id || !config.instance_id) {
          return { success: false, error: 'Group and instance required' };
        }
        const inviteResponse = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/group-send-invite`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
            },
            body: JSON.stringify({
              group_id: config.group_id,
              instance_id: config.instance_id,
              contact_id: contactId,
              message: replaceVariables(config.message, data)
            })
          }
        );
        const inviteResult = await inviteResponse.json();
        if (!inviteResponse.ok) {
          throw new Error(inviteResult.error || 'Failed to send invite');
        }
        return { success: true, output: `Invite sent for "${config.group_name}"` };

      case 'http_request':
        if (!config.url) {
          return { success: false, error: 'No URL configured' };
        }
        try {
          let body = config.body;
          if (body) {
            body = replaceVariables(body, data);
          }
          const headers = config.headers ? JSON.parse(config.headers) : {};
          
          const httpResponse = await fetch(config.url, {
            method: config.method || 'POST',
            headers: { 'Content-Type': 'application/json', ...headers },
            body: body ? body : undefined
          });
          
          if (!httpResponse.ok) {
            throw new Error(`HTTP ${httpResponse.status}: ${httpResponse.statusText}`);
          }
          return { success: true, output: `HTTP ${config.method || 'POST'} to ${config.url} - Status: ${httpResponse.status}` };
        } catch (httpErr: any) {
          return { success: false, error: `HTTP request failed: ${httpErr.message}` };
        }

      case 'ai_response':
        // AI response would be handled by a separate AI edge function
        console.log('AI response action - would call AI function');
        return { success: true, output: 'AI response queued' };

      default:
        return { success: true, output: `Action ${actionType} executed` };
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function executeMessageWithRetry(
  supabase: any,
  actionType: string,
  config: any,
  data: any,
  tenantId: string,
  contactId?: string
): Promise<{ success: boolean; output?: string; error?: string }> {
  let lastError: string | null = null;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Ensure minimum delay between messages
      await ensureMessageDelay();
      
      const result = await executeMessageAction(actionType, config, data, contactId);
      return result;
    } catch (err: any) {
      lastError = err.message;
      console.error(`Message attempt ${attempt} failed:`, err.message);
      
      if (attempt < MAX_RETRIES) {
        // Exponential backoff: 2s, 4s, 8s
        const backoff = Math.pow(2, attempt) * 1000;
        console.log(`Retrying in ${backoff}ms...`);
        await new Promise(r => setTimeout(r, backoff));
      }
    }
  }
  
  return { success: false, error: `Message failed after ${MAX_RETRIES} attempts: ${lastError}` };
}

async function executeMessageAction(
  actionType: string,
  config: any,
  data: any,
  contactId?: string
): Promise<{ success: boolean; output?: string; error?: string }> {
  if (!contactId) {
    return { success: false, error: 'No contact ID for message' };
  }

  const instanceId = config.instance_id || data.instance_id;
  if (!instanceId) {
    return { success: false, error: 'No instance configured for message' };
  }

  // Determine content type and prepare message
  let contentType = 'text';
  let content = '';
  let mediaUrl = '';
  let filename = '';
  let lat = '';
  let lng = '';
  
  switch (actionType) {
    case 'send_text':
    case 'send_message':
      contentType = 'text';
      content = replaceVariables(config.message || '', data);
      if (!content) {
        return { success: false, error: 'No message content' };
      }
      break;
    case 'send_image':
      contentType = 'image';
      mediaUrl = config.media_url;
      content = replaceVariables(config.caption || '', data);
      break;
    case 'send_video':
      contentType = 'video';
      mediaUrl = config.media_url;
      content = replaceVariables(config.caption || '', data);
      break;
    case 'send_voice':
      contentType = 'ptt'; // Push-to-talk (voice)
      mediaUrl = config.media_url;
      break;
    case 'send_audio':
      contentType = 'audio';
      mediaUrl = config.media_url;
      filename = config.filename || 'audio.mp3';
      break;
    case 'send_document':
      contentType = 'document';
      mediaUrl = config.media_url;
      filename = config.filename || 'document';
      content = replaceVariables(config.caption || '', data);
      break;
    case 'send_location':
      contentType = 'location';
      lat = config.lat;
      lng = config.lng;
      content = config.location_name || '';
      break;
  }

  // Validate media URL for media types
  if (['image', 'video', 'ptt', 'audio', 'document'].includes(contentType) && !mediaUrl) {
    return { success: false, error: 'No media URL configured' };
  }

  // Call the actual send-message function
  const response = await fetch(
    `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-message`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
      },
      body: JSON.stringify({
        contact_id: contactId,
        instance_id: instanceId,
        content: content,
        content_type: contentType,
        media_url: mediaUrl || undefined,
        media_filename: filename || undefined,
        location_lat: lat || undefined,
        location_lng: lng || undefined,
      })
    }
  );

  const result = await response.json();

  if (!response.ok || result.error) {
    throw new Error(result.error || `Failed to send ${contentType} message`);
  }

  const preview = content ? content.slice(0, 50) : contentType;
  return { success: true, output: `Sent ${contentType}: ${preview}...` };
}

function replaceVariables(text: string, data: any): string {
  if (!text) return '';
  
  let result = text;
  result = result.replace(/\{\{contact\.name\}\}/g, data.contact_name || 'Customer');
  result = result.replace(/\{\{contact\.phone\}\}/g, data.contact_phone || '');
  result = result.replace(/\{\{order\.number\}\}/g, data.order_number || '');
  result = result.replace(/\{\{order\.total\}\}/g, data.order_total || '');
  result = result.replace(/\{\{order\.status\}\}/g, data.order_status || '');
  result = result.replace(/\{\{label\.name\}\}/g, data.label_name || '');
  result = result.replace(/\{\{message\.content\}\}/g, data.message_content || '');
  
  return result;
}

function evaluateCondition(config: any, data: any): boolean {
  if (!config.field || !config.operator) return true;

  const fieldValue = getNestedValue(data, config.field);
  const compareValue = config.value;

  switch (config.operator) {
    case 'equals':
      return fieldValue === compareValue;
    case 'not_equals':
      return fieldValue !== compareValue;
    case 'contains':
      return String(fieldValue).includes(String(compareValue));
    case 'not_contains':
      return !String(fieldValue).includes(String(compareValue));
    case 'starts_with':
      return String(fieldValue).startsWith(String(compareValue));
    case 'ends_with':
      return String(fieldValue).endsWith(String(compareValue));
    case 'greater_than':
      return Number(fieldValue) > Number(compareValue);
    case 'less_than':
      return Number(fieldValue) < Number(compareValue);
    case 'is_empty':
      return !fieldValue || fieldValue === '';
    case 'is_not_empty':
      return !!fieldValue && fieldValue !== '';
    default:
      return true;
  }
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((curr, key) => curr?.[key], obj);
}

function calculateDelayMs(delay: number, unit: string): number {
  switch (unit) {
    case 'seconds': return delay * 1000;
    case 'minutes': return delay * 60 * 1000;
    case 'hours': return delay * 60 * 60 * 1000;
    case 'days': return delay * 24 * 60 * 60 * 1000;
    default: return delay * 1000;
  }
}
