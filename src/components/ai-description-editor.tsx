'use client';

import { useState } from 'react';
import type { Product } from '@/lib/types';
import { rewriteProductDescription } from '@/ai/flows/rewrite-product-description';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Wand2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const tones = ['Professional', 'Casual', 'Humorous', 'Persuasive', 'Excited'];

export function AiDescriptionEditor({ product }: { product: Product }) {
  const [currentDescription, setCurrentDescription] = useState(product.description);
  const [tone, setTone] = useState('Professional');
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleRewrite = async () => {
    setIsLoading(true);
    try {
      const result = await rewriteProductDescription({
        description: product.description,
        tone: tone,
      });
      if (result.rewrittenDescription) {
        setCurrentDescription(result.rewrittenDescription);
      } else {
        throw new Error('Failed to get a rewritten description.');
      }
    } catch (error) {
      console.error(error);
      toast({
        title: 'Error',
        description: 'Could not rewrite the description. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
     toast({
        title: 'Success!',
        description: 'The product description has been updated.',
      });
      setIsDialogOpen(false);
  }

  return (
    <div>
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold font-headline">Description</h2>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Wand2 className="mr-2 h-4 w-4" />
                Rewrite with AI
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[625px]">
              <DialogHeader>
                <DialogTitle>Rewrite Product Description</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                    <h3 className="font-semibold">Original</h3>
                    <Textarea readOnly value={product.description} className="h-48 resize-none bg-muted" />
                </div>
                <div className="space-y-2">
                    <h3 className="font-semibold">AI-Powered Rewrite</h3>
                    <Textarea value={currentDescription} onChange={(e) => setCurrentDescription(e.target.value)} className="h-48 resize-none" />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a tone" />
                  </SelectTrigger>
                  <SelectContent>
                    {tones.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                 <Button onClick={handleRewrite} disabled={isLoading} className="w-full">
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Wand2 className="mr-2 h-4 w-4" />
                  )}
                  Rewrite
                </Button>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="secondary">Cancel</Button>
                </DialogClose>
                <Button type="button" onClick={handleApply}>Apply Changes</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <p className="text-muted-foreground leading-relaxed">{currentDescription}</p>
      </div>
    </div>
  );
}
