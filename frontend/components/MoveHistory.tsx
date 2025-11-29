'use client';

import { Move } from '../store/gameStore';

interface MoveHistoryProps {
  moves: Move[];
}

export default function MoveHistory({ moves }: MoveHistoryProps) {
  const groupedMoves: Array<{ number: number; white?: Move; black?: Move }> = [];
  
  moves.forEach((move, index) => {
    const turnNumber = Math.floor(index / 2) + 1;
    const isWhite = index % 2 === 0;

    if (isWhite) {
      groupedMoves.push({ number: turnNumber, white: move });
    } else {
      const lastGroup = groupedMoves[groupedMoves.length - 1];
      if (lastGroup) {
        lastGroup.black = move;
      }
    }
  });

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
      <h3 className="text-lg font-bold text-white mb-4">Move History</h3>
      <div className="max-h-96 overflow-y-auto space-y-1">
        {groupedMoves.map((group) => (
          <div
            key={group.number}
            className="flex items-center gap-2 text-white/90 text-sm p-2 hover:bg-white/5 rounded"
          >
            <span className="font-semibold w-8">{group.number}.</span>
            <span className="w-20">{group.white?.moveNotation || '...'}</span>
            <span>{group.black?.moveNotation || ''}</span>
          </div>
        ))}
        {groupedMoves.length === 0 && (
          <div className="text-white/60 text-center py-4">No moves yet</div>
        )}
      </div>
    </div>
  );
}

