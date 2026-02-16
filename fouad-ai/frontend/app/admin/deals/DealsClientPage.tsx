'use client';

import { useState } from 'react';
import { CreateDealModal } from '@/components/admin/CreateDealModal';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export function CreateDealButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        <Plus className="w-4 h-4 mr-2" />
        New Deal
      </Button>
      <CreateDealModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSuccess={() => window.location.reload()}
      />
    </>
  );
}
