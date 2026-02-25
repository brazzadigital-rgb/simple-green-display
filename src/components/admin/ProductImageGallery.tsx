import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Upload, X, Loader2, Star, GripVertical } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ProductImage {
  id?: string;
  url: string;
  is_primary: boolean;
  sort_order: number;
}

interface ProductImageGalleryProps {
  productId: string | null;
  images: ProductImage[];
  onChange: (images: ProductImage[]) => void;
}

export function ProductImageGallery({ productId, images, onChange }: ProductImageGalleryProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const newImages: ProductImage[] = [...images];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split(".").pop();
      const path = `products/${Date.now()}-${i}.${ext}`;

      const { error } = await supabase.storage.from("store-assets").upload(path, file, { upsert: true });
      if (error) {
        toast({ title: "Erro no upload", description: error.message, variant: "destructive" });
        continue;
      }

      const { data: urlData } = supabase.storage.from("store-assets").getPublicUrl(path);
      newImages.push({
        url: urlData.publicUrl,
        is_primary: newImages.length === 0,
        sort_order: newImages.length,
      });
    }

    onChange(newImages);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleRemove = (index: number) => {
    const updated = images.filter((_, i) => i !== index);
    // If removed image was primary, set first as primary
    if (updated.length > 0 && !updated.some(img => img.is_primary)) {
      updated[0].is_primary = true;
    }
    onChange(updated);
  };

  const handleSetPrimary = (index: number) => {
    const updated = images.map((img, i) => ({
      ...img,
      is_primary: i === index,
    }));
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-sans text-sm font-medium">Galeria de Imagens</p>
        <span className="text-xs text-muted-foreground font-sans">{images.length} imagem(ns)</span>
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {images.map((img, index) => (
            <div key={index} className="relative group rounded-xl overflow-hidden border border-border bg-muted aspect-square">
              <img src={img.url} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => handleSetPrimary(index)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                    img.is_primary
                      ? "bg-accent text-accent-foreground"
                      : "bg-white/80 text-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                  title="Definir como principal"
                >
                  <Star className="w-3.5 h-3.5" fill={img.is_primary ? "currentColor" : "none"} />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  className="w-7 h-7 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                  title="Remover"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              {img.is_primary && (
                <span className="absolute top-1.5 left-1.5 bg-accent text-accent-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-md font-sans">
                  Principal
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      <input ref={inputRef} type="file" accept="image/*" multiple onChange={handleUpload} className="hidden" />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="rounded-xl gap-2 font-sans w-full"
      >
        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        {uploading ? "Enviando..." : "Adicionar Imagens"}
      </Button>
    </div>
  );
}
