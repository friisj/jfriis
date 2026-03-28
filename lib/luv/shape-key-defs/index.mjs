import nose from './nose.mjs';
import mouth from './mouth.mjs';
import eyes from './eyes.mjs';
import skeletal from './skeletal.mjs';
import body from './body.mjs';

export const ALL_SHAPE_KEY_DEFS = [
  ...nose,
  ...mouth,
  ...eyes,
  ...skeletal,
  ...body,
];

export { nose, mouth, eyes, skeletal, body };
