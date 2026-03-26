import { useState, useCallback } from 'react';

/**
 * 공통 모달 상태 관리 훅
 * @returns {{ modalState, showModal, closeModal }}
 */
export default function useModalState() {
  const [modalState, setModalState] = useState({ isOpen: false, title: '', description: '', type: 'info', onConfirm: null });

  const showModal = useCallback((title, description, type = 'info', onConfirm = null) => {
    setModalState({ isOpen: true, title, description, type, onConfirm });
  }, []);

  const closeModal = useCallback(() => {
    setModalState({ isOpen: false, title: '', description: '', type: 'info', onConfirm: null });
  }, []);

  return { modalState, showModal, closeModal };
}
