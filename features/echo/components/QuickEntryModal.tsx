import { useCallback, useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import type { EchoEntry } from '../types';
import { useQuickEntry } from '../hooks/useQuickEntry';
import { EchoComposer } from './EchoComposer';

type QuickEntryModalProps = {
  initialGoalId?: string | null;
  onClose: () => void;
  onSaved: (entry: EchoEntry | undefined) => void;
  visible: boolean;
};

export function QuickEntryModal({
  initialGoalId,
  onClose,
  onSaved,
  visible,
}: QuickEntryModalProps) {
  const { goals, saveEntry } = useQuickEntry(visible);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!visible) setIsSaving(false);
  }, [visible]);

  const handleSavingChange = useCallback((saving: boolean) => {
    setIsSaving(saving);
  }, []);

  const handleSaved = useCallback((entry: EchoEntry | undefined) => {
    setIsSaving(false);
    onSaved(entry);
  }, [onSaved]);

  return (
    <Modal
      closeDisabled={isSaving}
      closeOnBackdropPress
      contentStyle={{
        maxHeight: '90%',
        maxWidth: 680,
        overflow: 'hidden',
        padding: 0,
      }}
      onClose={onClose}
      showCloseButton={false}
      visible={visible}
    >
      {visible ? (
        <EchoComposer
          goals={goals}
          initialGoalId={initialGoalId}
          onCancel={onClose}
          onSaved={handleSaved}
          onSavingChange={handleSavingChange}
          presentation="modal"
          saveEntry={saveEntry}
        />
      ) : null}
    </Modal>
  );
}
