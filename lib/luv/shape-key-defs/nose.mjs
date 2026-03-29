/** Nose basis shape keys — 8 atomic axes */
export default [
  {
    name: 'luv_nose_bridge_width',
    bones: ['DEF-nose_bridge.L', 'DEF-nose_bridge.R'],
    axis: [1, 0, 0],
    magnitude: 0.004,
    symmetric: true,
  },
  {
    name: 'luv_nose_bridge_depth',
    bones: ['DEF-nose_bridge.L', 'DEF-nose_bridge.R'],
    axis: [0, 0, 1],
    magnitude: 0.004,
  },
  {
    name: 'luv_nose_bridge_height',
    bones: ['DEF-nose_bridge.L', 'DEF-nose_bridge.R'],
    axis: [0, 1, 0],
    magnitude: 0.003,
  },
  {
    name: 'luv_nose_tip_height',
    bones: ['DEF-nostril_low.L', 'DEF-nostril_low.R', 'DEF-nostril.L', 'DEF-nostril.R'],
    axis: [0, 1, 0],
    magnitude: 0.004,
  },
  {
    name: 'luv_nose_tip_projection',
    bones: ['DEF-nostril_low.L', 'DEF-nostril_low.R', 'DEF-nostril.L', 'DEF-nostril.R'],
    axis: [0, 0, 1],
    magnitude: 0.005,
  },
  {
    name: 'luv_nose_nostril_width',
    bones: ['DEF-nostril.L', 'DEF-nostril.R', 'DEF-nostril_low.L', 'DEF-nostril_low.R'],
    axis: [1, 0, 0],
    magnitude: 0.004,
    symmetric: true,
  },
  {
    name: 'luv_nose_nostril_height',
    bones: ['DEF-nostril.L', 'DEF-nostril.R', 'DEF-nostril_low.L', 'DEF-nostril_low.R'],
    axis: [0, 1, 0],
    magnitude: 0.003,
  },
  {
    name: 'luv_nose_size',
    bones: [
      'DEF-nose_bridge.L', 'DEF-nose_bridge.R',
      'DEF-nostril.L', 'DEF-nostril.R',
      'DEF-nostril_low.L', 'DEF-nostril_low.R',
    ],
    axis: [1, 1, 1],
    magnitude: 0.005,
    useRadial: true,
  },
];
