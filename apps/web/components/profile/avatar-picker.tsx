'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { users } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Upload, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AvatarPreset {
  key: string;
  name: string;
  category: string;
  icon: string;
  color: string;
}

interface AvatarPickerProps {
  onClose?: () => void;
  onSelect?: (key: string) => void;
}

export const avatarPresets: Record<string, { icon: string; color: string; name: string }> = {
  wood: { icon: '🪵', color: '#8B4513', name: 'Madeira' },
  brick: { icon: '🧱', color: '#B22222', name: 'Tijolo' },
  sheep: { icon: '🐑', color: '#90EE90', name: 'Ovelha' },
  wheat: { icon: '🌾', color: '#FFD700', name: 'Trigo' },
  ore: { icon: '🪨', color: '#696969', name: 'Pedra' },
  settlement: { icon: '🏠', color: '#4A90D9', name: 'Aldeia' },
  city: { icon: '🏰', color: '#9B59B6', name: 'Cidade' },
  road: { icon: '🛤️', color: '#8B4513', name: 'Estrada' },
  desert: { icon: '🏜️', color: '#F4A460', name: 'Deserto' },
  robber: { icon: '🏴', color: '#2C3E50', name: 'Ladrao' },
  dice: { icon: '🎲', color: '#E74C3C', name: 'Dado' },
  port: { icon: '⚓', color: '#3498DB', name: 'Porto' },
  knight: { icon: '🛡️', color: '#95A5A6', name: 'Cavaleiro' },
vp: { icon: '⭐', color: '#F1C40F', name: 'PV' },
  trade: { icon: '⚖️', color: '#1ABC9C', name: 'Comercio' },
};

const categoryLabels: Record<string, string> = {
  recurso: 'Recursos',
  construcao: 'Construção',
  especial: 'Especiais',
};

export function AvatarPicker({ onClose, onSelect }: AvatarPickerProps) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  const presets = Object.entries(avatarPresets).map(([key, value]) => ({
    key,
    ...value,
    category: ['wood', 'brick', 'sheep', 'wheat', 'ore'].includes(key) ? 'recurso' : 
             ['settlement', 'city', 'road'].includes(key) ? 'construcao' : 'especial',
  }));

  const presetMutation = useMutation({
    mutationFn: (key: string) => users.setAvatarPreset(key),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      onSelect?.(selectedKey!);
      onClose?.();
    },
  });

  const handlePresetSelect = (key: string) => {
    setSelectedKey(key);
    presetMutation.mutate(key);
  };

  const handleUpload = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      setUploading(true);
      try {
        await users.uploadAvatar(file);
        queryClient.invalidateQueries({ queryKey: ['profile'] });
        onClose?.();
      } catch (error) {
        console.error('Upload failed:', error);
      } finally {
        setUploading(false);
      }
    };
    input.click();
  };

  const filteredPresets = presets.filter(
    (p) => filter === 'all' || p.category === filter
  );

  const groupedPresets = filteredPresets.reduce((acc, preset) => {
    if (!acc[preset.category]) {
      acc[preset.category] = [];
    }
    acc[preset.category].push(preset);
    return acc;
  }, {} as Record<string, AvatarPreset[]>);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter('all')}
          className={cn(
            'rounded-full px-3 py-1 text-xs font-medium transition-colors',
            filter === 'all'
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
          )}
        >
          Todos
        </button>
        {Object.entries(categoryLabels).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition-colors',
              filter === key
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-3 max-h-64 overflow-y-auto">
          {Object.entries(groupedPresets).map(([category, items]) => (
            <div key={category}>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {categoryLabels[category] || category}
              </p>
              <div className="grid grid-cols-4 gap-2">
                {items.map((preset) => (
                  <button
                    key={preset.key}
                    onClick={() => handlePresetSelect(preset.key)}
                    disabled={presetMutation.isPending}
                    className={cn(
                      'group relative flex flex-col items-center rounded-xl border p-2 transition-all hover:scale-105',
                      'border-border/60 hover:border-border hover:bg-secondary/50',
                      selectedKey === preset.key && 'border-primary bg-primary/10'
                    )}
                  >
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-full text-2xl"
                      style={{ backgroundColor: preset.color + '30' }}
                    >
                      {preset.icon}
                    </div>
                    <span className="mt-1 text-[10px] text-muted-foreground">
                      {preset.name}
                    </span>
                    {selectedKey === preset.key && (
                      <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="h-3 w-3" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      <Card className="border-dashed">
        <CardContent className="p-3">
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:bg-secondary/50 hover:text-primary disabled:opacity-50"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Carregar imagem
              </>
            )}
          </button>
        </CardContent>
      </Card>
    </div>
  );
}