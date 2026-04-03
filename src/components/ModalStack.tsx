import React from 'react';
import { useTaskStore } from '../store/useTaskStore';
import { TaskModal } from './TaskModal';
import { ConfirmationModal } from './ConfirmationModal';

export function ModalStack() {
  const { modalState, closeModal } = useTaskStore();

  if (!modalState || !modalState.type) {
    return null;
  }

  return (
    <>
      {modalState.type === 'task' && modalState.taskId && (
        <TaskModal
          taskId={modalState.taskId}
          onClose={closeModal}
        />
      )}
      {modalState.type === 'confirmation' && modalState.confirmationConfig && (
        <ConfirmationModal
          isOpen={true}
          title={modalState.confirmationConfig.title}
          message={modalState.confirmationConfig.message}
          onConfirm={() => {
            modalState.confirmationConfig?.onConfirm();
            closeModal();
          }}
          onCancel={() => {
            if (modalState.confirmationConfig?.onCancel) {
              modalState.confirmationConfig.onCancel();
            }
            closeModal();
          }}
        />
      )}
    </>
  );
}
