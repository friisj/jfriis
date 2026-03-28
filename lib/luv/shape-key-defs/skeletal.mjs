/** Skeletal / face structure basis shape keys — 10 atomic axes */
export default [
  {
    name: 'luv_jaw_width',
    bones: ['DEF-cheek_jawline.L', 'DEF-cheek_jawline.R'],
    axis: [1, 0, 0],
    magnitude: 0.005,
    symmetric: true,
  },
  {
    name: 'luv_jaw_angle',
    bones: ['DEF-cheek_jawline.L', 'DEF-cheek_jawline.R'],
    axis: [0, 1, 1],
    magnitude: 0.004,
  },
  {
    name: 'luv_chin_projection',
    bones: ['DEF-chin.L', 'DEF-chin.R'],
    axis: [0, 0, 1],
    magnitude: 0.005,
  },
  {
    name: 'luv_chin_height',
    bones: ['DEF-chin.L', 'DEF-chin.R'],
    axis: [0, -1, 0],
    magnitude: 0.004,
  },
  {
    name: 'luv_chin_width',
    bones: ['DEF-chin.L', 'DEF-chin.R'],
    axis: [1, 0, 0],
    magnitude: 0.004,
    symmetric: true,
  },
  {
    name: 'luv_cheekbone_prominence',
    bones: ['DEF-cheek.L', 'DEF-cheek.R'],
    axis: [0, 0, 1],
    magnitude: 0.004,
  },
  {
    name: 'luv_cheekbone_height',
    bones: ['DEF-cheek.L', 'DEF-cheek.R'],
    axis: [0, 1, 0],
    magnitude: 0.003,
  },
  {
    name: 'luv_forehead_height',
    bones: ['DEF-brow_upper.001.L', 'DEF-brow_upper.002.L', 'DEF-brow_upper.003.L',
      'DEF-brow_upper.001.R', 'DEF-brow_upper.002.R', 'DEF-brow_upper.003.R',
      'DEF-brow_mid_upper'],
    axis: [0, 1, 0],
    magnitude: 0.005,
  },
  {
    name: 'luv_forehead_width',
    bones: ['DEF-temple.L', 'DEF-temple.R'],
    axis: [1, 0, 0],
    magnitude: 0.005,
    symmetric: true,
  },
  {
    name: 'luv_temple_width',
    bones: ['DEF-temple.L', 'DEF-temple.R'],
    axis: [1, 0, 0],
    magnitude: 0.004,
    symmetric: true,
  },
];
