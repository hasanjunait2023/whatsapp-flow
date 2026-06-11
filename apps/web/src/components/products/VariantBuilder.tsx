import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, X, Trash2, Wand2 } from 'lucide-react';
import { VariantOption, ProductVariant, VariantFormData } from '@/hooks/useProductVariants';

interface VariantBuilderProps {
  options: VariantOption[];
  variants: (ProductVariant | VariantFormData)[];
  onOptionsChange: (options: VariantOption[]) => void;
  onVariantsChange: (variants: VariantFormData[]) => void;
  onGenerateVariants: () => void;
  basePrice: number;
}

const OPTION_PRESETS = [
  { name: 'Size', values: ['S', 'M', 'L', 'XL'] },
  { name: 'Color', values: ['Red', 'Blue', 'Green', 'Black', 'White'] },
  { name: 'Material', values: ['Cotton', 'Polyester', 'Silk', 'Wool'] },
];

export function VariantBuilder({
  options,
  variants,
  onOptionsChange,
  onVariantsChange,
  onGenerateVariants,
  basePrice,
}: VariantBuilderProps) {
  const [newOptionName, setNewOptionName] = useState('');
  const [newOptionValues, setNewOptionValues] = useState<string[]>([]);
  const [currentValue, setCurrentValue] = useState('');

  const addOption = () => {
    if (!newOptionName.trim() || newOptionValues.length === 0) return;
    
    onOptionsChange([
      ...options,
      { name: newOptionName.trim(), values: newOptionValues },
    ]);
    setNewOptionName('');
    setNewOptionValues([]);
  };

  const removeOption = (index: number) => {
    onOptionsChange(options.filter((_, i) => i !== index));
  };

  const addValue = () => {
    if (!currentValue.trim() || newOptionValues.includes(currentValue.trim())) return;
    setNewOptionValues([...newOptionValues, currentValue.trim()]);
    setCurrentValue('');
  };

  const removeValue = (value: string) => {
    setNewOptionValues(newOptionValues.filter((v) => v !== value));
  };

  const addPreset = (preset: typeof OPTION_PRESETS[0]) => {
    if (options.some((o) => o.name === preset.name)) return;
    onOptionsChange([...options, preset]);
  };

  const updateVariantField = (index: number, field: keyof VariantFormData, value: any) => {
    const updated = [...variants] as VariantFormData[];
    updated[index] = { ...updated[index], [field]: value };
    onVariantsChange(updated);
  };

  const removeVariant = (index: number) => {
    onVariantsChange((variants as VariantFormData[]).filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      {/* Option Presets */}
      <div>
        <Label className="text-sm font-medium">Quick Add Options</Label>
        <div className="flex gap-2 mt-2">
          {OPTION_PRESETS.map((preset) => (
            <Button
              key={preset.name}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addPreset(preset)}
              disabled={options.some((o) => o.name === preset.name)}
            >
              <Plus className="h-3 w-3 mr-1" />
              {preset.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Current Options */}
      {options.length > 0 && (
        <div className="space-y-3">
          <Label className="text-sm font-medium">Variant Options</Label>
          {options.map((option, index) => (
            <Card key={index}>
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{option.name}</span>
                    <div className="flex gap-1 flex-wrap">
                      {option.values.map((value) => (
                        <Badge key={value} variant="secondary">
                          {value}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeOption(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add New Option */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Add Custom Option</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Option Name</Label>
              <Input
                placeholder="e.g., Size, Color"
                value={newOptionName}
                onChange={(e) => setNewOptionName(e.target.value)}
              />
            </div>
            <div>
              <Label>Add Values</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., Small"
                  value={currentValue}
                  onChange={(e) => setCurrentValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addValue())}
                />
                <Button type="button" variant="outline" onClick={addValue}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          
          {newOptionValues.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {newOptionValues.map((value) => (
                <Badge key={value} variant="secondary" className="gap-1">
                  {value}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeValue(value)}
                  />
                </Badge>
              ))}
            </div>
          )}
          
          <Button
            type="button"
            variant="secondary"
            onClick={addOption}
            disabled={!newOptionName.trim() || newOptionValues.length === 0}
            className="w-full"
          >
            Add Option
          </Button>
        </CardContent>
      </Card>

      {/* Generate Variants Button */}
      {options.length > 0 && (
        <Button
          type="button"
          onClick={onGenerateVariants}
          className="w-full"
        >
          <Wand2 className="h-4 w-4 mr-2" />
          Generate {options.reduce((acc, o) => acc * o.values.length, 1)} Variant Combinations
        </Button>
      )}

      {/* Variants Table */}
      {variants.length > 0 && (
        <div>
          <Label className="text-sm font-medium mb-2 block">Variants ({variants.length})</Label>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Variant</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Price Override</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {variants.map((variant, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{variant.name}</TableCell>
                    <TableCell>
                      <Input
                        className="h-8 w-24"
                        placeholder="SKU"
                        value={variant.sku || ''}
                        onChange={(e) => updateVariantField(index, 'sku', e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        className="h-8 w-24"
                        placeholder={basePrice.toString()}
                        value={variant.price ?? ''}
                        onChange={(e) => updateVariantField(index, 'price', e.target.value ? parseFloat(e.target.value) : undefined)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        className="h-8 w-20"
                        value={variant.stock_quantity || 0}
                        onChange={(e) => updateVariantField(index, 'stock_quantity', parseInt(e.target.value) || 0)}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeVariant(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
