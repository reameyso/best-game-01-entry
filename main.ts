// EMBERFALL — the entry program (Node 22, standard library only).
// It hands the game in: copies game/ and screenshots/ from beside this file into
// the output directory and writes /output/dossier.json with the kit's vendored
// dossier library, exactly as the kit asks. Outside the grader, MAKEFUN_OUTPUT_DIR
// stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Fail loudly instead of handing in a half-copied game: the grader runs this
// twice and both runs must write the same bytes.
if (!existsSync(join(here, 'game', 'index.html'))) {
  throw new Error('game/index.html is missing — the entry cannot be handed in');
}
if (!existsSync(join(here, 'screenshots'))) {
  throw new Error('screenshots/ is missing — the entry needs 3 or 4 screenshots');
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's caps, from the kit: at most 4 screenshots of 256 KiB, at most 993
// files / 48 MiB under game/, and the dossier text capped at 160 KiB.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
