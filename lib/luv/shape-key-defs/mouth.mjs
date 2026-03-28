/** Mouth basis shape keys — 10 atomic axes */
export default [
  {
    name: 'luv_mouth_width',
    bones: ['DEF-lip.L', 'DEF-lip.R', 'DEF-corner_up_lip.L', 'DEF-corner_up_lip.R', 'DEF-corner_low_lip.L', 'DEF-corner_low_lip.R', 'DEF-corner_out_lip.L', 'DEF-corner_out_lip.R'],
    axis: [1, 0, 0],
    magnitude: 0.004,
    symmetric: true,
  },
  {
    name: 'luv_mouth_upper_fullness',
    bones: ['DEF-lip_upper', 'DEF-lip_upper_01.L', 'DEF-lip_upper_01.R', 'DEF-lip_upper_02.L', 'DEF-lip_upper_02.R', 'DEF-lip_upper_03.L', 'DEF-lip_upper_03.R'],
    axis: [0, 0, 1],
    magnitude: 0.003,
  },
  {
    name: 'luv_mouth_lower_fullness',
    bones: ['DEF-lip_lower', 'DEF-lip_lower.01.L', 'DEF-lip_lower.01.R', 'DEF-lip_lower.02.L', 'DEF-lip_lower.02.R', 'DEF-lip_lower.03.L', 'DEF-lip_lower.03.R'],
    axis: [0, 0, 1],
    magnitude: 0.003,
  },
  {
    name: 'luv_mouth_upper_height',
    bones: ['DEF-lip_upper', 'DEF-lip_upper_01.L', 'DEF-lip_upper_01.R', 'DEF-lip_upper_02.L', 'DEF-lip_upper_02.R', 'DEF-lip_upper_03.L', 'DEF-lip_upper_03.R'],
    axis: [0, 1, 0],
    magnitude: 0.002,
  },
  {
    name: 'luv_mouth_lower_height',
    bones: ['DEF-lip_lower', 'DEF-lip_lower.01.L', 'DEF-lip_lower.01.R', 'DEF-lip_lower.02.L', 'DEF-lip_lower.02.R', 'DEF-lip_lower.03.L', 'DEF-lip_lower.03.R'],
    axis: [0, -1, 0],
    magnitude: 0.002,
  },
  {
    name: 'luv_mouth_corner_height',
    bones: ['DEF-corner_up_lip.L', 'DEF-corner_up_lip.R', 'DEF-corner_low_lip.L', 'DEF-corner_low_lip.R'],
    axis: [0, 1, 0],
    magnitude: 0.003,
  },
  {
    name: 'luv_mouth_projection',
    bones: ['DEF-lip_upper', 'DEF-lip_lower', 'DEF-lip.L', 'DEF-lip.R',
      'DEF-lip_upper_01.L', 'DEF-lip_upper_01.R', 'DEF-lip_lower.01.L', 'DEF-lip_lower.01.R'],
    axis: [0, 0, 1],
    magnitude: 0.003,
  },
  {
    name: 'luv_mouth_cupid_bow',
    bones: ['DEF-lip_upper', 'DEF-lip_upper_01.L', 'DEF-lip_upper_01.R'],
    axis: [0, 1, 0],
    magnitude: 0.002,
  },
  {
    name: 'luv_mouth_dimple_depth',
    bones: ['DEF-cheek_corner.L', 'DEF-cheek_corner.R'],
    axis: [0, 0, -1],
    magnitude: 0.003,
  },
  {
    name: 'luv_mouth_size',
    bones: ['DEF-lip_upper', 'DEF-lip_lower', 'DEF-lip.L', 'DEF-lip.R',
      'DEF-lip_upper_01.L', 'DEF-lip_upper_01.R', 'DEF-lip_upper_02.L', 'DEF-lip_upper_02.R',
      'DEF-lip_lower.01.L', 'DEF-lip_lower.01.R', 'DEF-lip_lower.02.L', 'DEF-lip_lower.02.R',
      'DEF-corner_up_lip.L', 'DEF-corner_up_lip.R', 'DEF-corner_low_lip.L', 'DEF-corner_low_lip.R'],
    axis: [1, 1, 1],
    magnitude: 0.004,
    useRadial: true,
  },
];
