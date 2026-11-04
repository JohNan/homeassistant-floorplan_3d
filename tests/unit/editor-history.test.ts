import { describe, expect, it } from 'vitest';
import { EditorHistory } from '../../src/editor/state/EditorHistory';
import { createDefaultFloorplanDocument } from '../../src/types/floorplan';

describe('EditorHistory (src/editor/state/EditorHistory.ts)', () => {
  it('initializes with a deep cloned state and clean dirty status', () => {
    const initialDoc = createDefaultFloorplanDocument();
    const history = new EditorHistory(initialDoc);

    expect(history.current.id).toBe(initialDoc.id);
    expect(history.canUndo).toBe(false);
    expect(history.canRedo).toBe(false);
    expect(history.isDirty).toBe(false);
    expect(history.length).toBe(1);
    expect(history.index).toBe(0);
  });

  it('guarantees immutability via deep cloning', () => {
    const initialDoc = createDefaultFloorplanDocument();
    const history = new EditorHistory(initialDoc);

    // Mutate the original object after passing to history
    initialDoc.name = 'Mutated Externally';
    expect(history.current.name).toBe('Main House');

    // Mutate the object retrieved from history.current
    const curr = history.current;
    curr.name = 'Mutated From Getter';
    expect(history.current.name).toBe('Main House');
  });

  it('handles push, undo, and redo cycles correctly', () => {
    const doc0 = createDefaultFloorplanDocument('house', 'V0');
    const history = new EditorHistory(doc0);

    const doc1 = createDefaultFloorplanDocument('house', 'V1');
    history.push(doc1, 'Edit 1');

    expect(history.current.name).toBe('V1');
    expect(history.canUndo).toBe(true);
    expect(history.canRedo).toBe(false);
    expect(history.isDirty).toBe(true);
    expect(history.length).toBe(2);

    const doc2 = createDefaultFloorplanDocument('house', 'V2');
    history.push(doc2, 'Edit 2');

    expect(history.current.name).toBe('V2');
    expect(history.length).toBe(3);

    // Undo to V1
    const undone1 = history.undo();
    expect(undone1?.name).toBe('V1');
    expect(history.current.name).toBe('V1');
    expect(history.canUndo).toBe(true);
    expect(history.canRedo).toBe(true);

    // Undo to V0
    const undone0 = history.undo();
    expect(undone0?.name).toBe('V0');
    expect(history.canUndo).toBe(false);
    expect(history.canRedo).toBe(true);
    // When back at initial saved revision index 0, isDirty is false
    expect(history.isDirty).toBe(false);

    // Extra undo returns null
    expect(history.undo()).toBeNull();

    // Redo to V1
    const redone1 = history.redo();
    expect(redone1?.name).toBe('V1');
    expect(history.isDirty).toBe(true);

    // Redo to V2
    const redone2 = history.redo();
    expect(redone2?.name).toBe('V2');
    expect(history.canRedo).toBe(false);

    // Extra redo returns null
    expect(history.redo()).toBeNull();
  });

  it('discards redo branch on push after undo', () => {
    const history = new EditorHistory({ val: 0 });
    history.push({ val: 1 });
    history.push({ val: 2 });
    history.push({ val: 3 });

    // Undo twice -> at val: 1
    history.undo();
    history.undo();
    expect(history.current.val).toBe(1);
    expect(history.canRedo).toBe(true);

    // Push new branch val: 99
    history.push({ val: 99 }, 'Branch edit');
    expect(history.current.val).toBe(99);
    expect(history.canRedo).toBe(false);
    expect(history.length).toBe(3); // [0, 1, 99]

    // Undo goes to 1 then 0
    expect(history.undo()?.val).toBe(1);
    expect(history.undo()?.val).toBe(0);
    expect(history.canUndo).toBe(false);
  });

  it('tracks dirty status accurately with markSaved()', () => {
    const history = new EditorHistory({ val: 0 });
    expect(history.isDirty).toBe(false);

    history.push({ val: 1 });
    expect(history.isDirty).toBe(true);

    history.markSaved();
    expect(history.isDirty).toBe(false);

    history.push({ val: 2 });
    expect(history.isDirty).toBe(true);

    // Undo back to saved state (val: 1)
    history.undo();
    expect(history.current.val).toBe(1);
    expect(history.isDirty).toBe(false);

    // Undo back to val: 0 -> dirty relative to saved state
    history.undo();
    expect(history.current.val).toBe(0);
    expect(history.isDirty).toBe(true);

    // Redo back to val: 1 -> clean again
    history.redo();
    expect(history.isDirty).toBe(false);
  });

  it('caps history ring-buffer at maxSteps (default 50) and drops oldest entries', () => {
    const history = new EditorHistory({ step: 0 }, 50);

    for (let i = 1; i <= 60; i++) {
      history.push({ step: i });
    }

    // Must be capped at 50
    expect(history.length).toBe(50);
    expect(history.current.step).toBe(60);

    // Can undo exactly 49 times (from step 60 down to step 11)
    let undoCount = 0;
    while (history.canUndo) {
      history.undo();
      undoCount++;
    }

    expect(undoCount).toBe(49);
    expect(history.current.step).toBe(11);
    // Initial steps 0..10 were pruned
    expect(history.canUndo).toBe(false);
  });

  it('invalidates savedIndex if the saved state is pruned from the ring buffer', () => {
    const history = new EditorHistory({ step: 0 }, 5);
    history.markSaved(); // saved at step 0

    for (let i = 1; i <= 6; i++) {
      history.push({ step: i });
    }

    // Step 0 was pruned, so isDirty must remain true
    expect(history.isDirty).toBe(true);
    history.markSaved();
    expect(history.isDirty).toBe(false);
  });

  it('reset() reinitializes history with new state and resets dirty flags', () => {
    const history = new EditorHistory({ step: 1 });
    history.push({ step: 2 });
    history.push({ step: 3 });
    expect(history.isDirty).toBe(true);

    history.reset({ step: 100 });
    expect(history.current.step).toBe(100);
    expect(history.length).toBe(1);
    expect(history.canUndo).toBe(false);
    expect(history.canRedo).toBe(false);
    expect(history.isDirty).toBe(false);
  });
});
