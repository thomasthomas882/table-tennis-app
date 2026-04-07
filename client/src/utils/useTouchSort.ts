import { useRef } from 'react';

interface UseTouchSortOptions {
  containerRef: React.RefObject<HTMLElement | null>;
  onReorder: (fromIdx: number, toIdx: number) => void;
}

interface TouchHandlers {
  onTouchStart: (e: React.TouchEvent) => void;
}

export function useTouchSort({ containerRef, onReorder }: UseTouchSortOptions) {
  const draggingIdx = useRef<number | null>(null);
  const ghostEl = useRef<HTMLDivElement | null>(null);
  const hoverIdx = useRef<number | null>(null);
  const insertIndicator = useRef<HTMLDivElement | null>(null);

  function getListItems(): HTMLElement[] {
    if (!containerRef.current) return [];
    return Array.from(containerRef.current.querySelectorAll('[data-touch-sort-item]')) as HTMLElement[];
  }

  function removeGhost() {
    if (ghostEl.current) {
      ghostEl.current.remove();
      ghostEl.current = null;
    }
  }

  function removeIndicator() {
    if (insertIndicator.current) {
      insertIndicator.current.remove();
      insertIndicator.current = null;
    }
  }

  function createGhost(sourceEl: HTMLElement, touch: { clientX: number; clientY: number }) {
    const rect = sourceEl.getBoundingClientRect();
    const ghost = document.createElement('div');
    ghost.style.cssText = `
      position: fixed;
      left: ${rect.left}px;
      top: ${rect.top}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      opacity: 0.75;
      pointer-events: none;
      z-index: 9999;
      background: var(--bg-card, #1e293b);
      border: 1px solid rgba(74, 222, 128, 0.5);
      border-radius: 8px;
      box-shadow: 0 8px 25px rgba(0,0,0,0.4);
      transform: scale(1.03);
      transition: none;
      padding: 12px;
      display: flex;
      align-items: center;
      gap: 12px;
      color: white;
      font-size: 14px;
    `;
    ghost.innerHTML = sourceEl.innerHTML;
    document.body.appendChild(ghost);
    ghostEl.current = ghost;
    return ghost;
  }

  function moveGhost(touch: { clientX: number; clientY: number }, ghost: HTMLDivElement) {
    const rect = ghost.getBoundingClientRect();
    ghost.style.left = `${touch.clientX - rect.width / 2}px`;
    ghost.style.top  = `${touch.clientY - rect.height / 2}px`;
  }

  function showInsertIndicator(beforeEl: HTMLElement | null) {
    removeIndicator();
    const items = getListItems();
    if (items.length === 0) return;

    const indicator = document.createElement('div');
    indicator.style.cssText = `
      position: fixed;
      left: 0;
      right: 0;
      height: 2px;
      background: rgba(74, 222, 128, 0.8);
      z-index: 9998;
      pointer-events: none;
      border-radius: 2px;
    `;

    if (beforeEl) {
      const rect = beforeEl.getBoundingClientRect();
      indicator.style.top = `${rect.top - 1}px`;
      indicator.style.left = `${rect.left}px`;
      indicator.style.width = `${rect.width}px`;
    } else {
      const lastItem = items[items.length - 1];
      const rect = lastItem.getBoundingClientRect();
      indicator.style.top = `${rect.bottom - 1}px`;
      indicator.style.left = `${rect.left}px`;
      indicator.style.width = `${rect.width}px`;
    }

    document.body.appendChild(indicator);
    insertIndicator.current = indicator;
  }

  function getTouchHandlers(index: number): TouchHandlers {
    return {
      onTouchStart: (e: React.TouchEvent) => {
        const touch = e.touches[0];
        draggingIdx.current = index;
        hoverIdx.current = index;

        const sourceEl = e.currentTarget as HTMLElement;
        const ghost = createGhost(sourceEl, touch);

        const rect = sourceEl.getBoundingClientRect();
        ghost.style.left = `${rect.left}px`;
        ghost.style.top  = `${rect.top}px`;

        const handleTouchMove = (ev: TouchEvent) => {
          ev.preventDefault();
          const t = ev.touches[0];

          if (ghostEl.current) {
            const gRect = ghostEl.current.getBoundingClientRect();
            ghostEl.current.style.left = `${t.clientX - gRect.width / 2}px`;
            ghostEl.current.style.top  = `${t.clientY - gRect.height / 2}px`;
          }

          // Temporarily hide ghost to find element underneath
          if (ghostEl.current) ghostEl.current.style.display = 'none';
          const elUnder = document.elementFromPoint(t.clientX, t.clientY);
          if (ghostEl.current) ghostEl.current.style.display = '';

          const items = getListItems();
          let foundIdx: number | null = null;

          for (let i = 0; i < items.length; i++) {
            if (items[i].contains(elUnder) || items[i] === elUnder) {
              foundIdx = i;
              break;
            }
          }

          if (foundIdx !== null && foundIdx !== draggingIdx.current) {
            hoverIdx.current = foundIdx;
            showInsertIndicator(items[foundIdx]);
          } else if (foundIdx === null) {
            removeIndicator();
          }
        };

        const handleTouchEnd = () => {
          removeGhost();
          removeIndicator();

          if (draggingIdx.current !== null && hoverIdx.current !== null &&
              draggingIdx.current !== hoverIdx.current) {
            onReorder(draggingIdx.current, hoverIdx.current);
          }

          draggingIdx.current = null;
          hoverIdx.current = null;

          document.removeEventListener('touchmove', handleTouchMove);
          document.removeEventListener('touchend', handleTouchEnd);
        };

        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchend', handleTouchEnd);
      },
    };
  }

  return { getTouchHandlers };
}
