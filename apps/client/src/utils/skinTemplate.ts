export interface SkinTemplate {
  name: string;
  description: string;
  regions: SkinRegion[];
}

export interface SkinRegion {
  name: string;
  sourceX: number;
  sourceY: number;
  sourceWidth: number;
  sourceHeight: number;
  targetX: number;
  targetY: number;
  targetWidth: number;
  targetHeight: number;
  mirror?: boolean;
}

export interface BodyPart {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export const SKIN_WIDTH = 64;
export const SKIN_HEIGHT = 64;

export const BODY_PARTS: Record<string, BodyPart> = {
  head: { name: '头部', x: 0, y: 0, width: 8, height: 8 },
  body: { name: '身体', x: 4, y: 8, width: 4, height: 6 },
  leftArm: { name: '左臂', x: 0, y: 8, width: 2, height: 6 },
  rightArm: { name: '右臂', x: 6, y: 8, width: 2, height: 6 },
  leftLeg: { name: '左腿', x: 2, y: 14, width: 2, height: 6 },
  rightLeg: { name: '右腿', x: 4, y: 14, width: 2, height: 6 },
};

export const MINECRAFT_SKIN_TEMPLATE: SkinTemplate = {
  name: 'Standard Minecraft Skin',
  description: '标准Minecraft皮肤模板 (64x64)',
  regions: [
    { name: 'head-front', sourceX: 0, sourceY: 0, sourceWidth: 8, sourceHeight: 8, targetX: 0, targetY: 0, targetWidth: 8, targetHeight: 8 },
    { name: 'head-back', sourceX: 0, sourceY: 0, sourceWidth: 8, sourceHeight: 8, targetX: 8, targetY: 0, targetWidth: 8, targetHeight: 8 },
    { name: 'head-right', sourceX: 0, sourceY: 0, sourceWidth: 8, sourceHeight: 8, targetX: 0, targetY: 8, targetWidth: 8, targetHeight: 8, mirror: true },
    { name: 'head-left', sourceX: 0, sourceY: 0, sourceWidth: 8, sourceHeight: 8, targetX: 8, targetY: 8, targetWidth: 8, targetHeight: 8 },
    { name: 'head-top', sourceX: 0, sourceY: 0, sourceWidth: 8, sourceHeight: 8, targetX: 8, targetY: 0, targetWidth: 8, targetHeight: 8 },
    { name: 'head-bottom', sourceX: 0, sourceY: 0, sourceWidth: 8, sourceHeight: 8, targetX: 16, targetY: 0, targetWidth: 8, targetHeight: 8 },
    { name: 'body-front', sourceX: 4, sourceY: 8, sourceWidth: 4, sourceHeight: 6, targetX: 16, targetY: 16, targetWidth: 4, targetHeight: 6 },
    { name: 'body-back', sourceX: 4, sourceY: 8, sourceWidth: 4, sourceHeight: 6, targetX: 32, targetY: 16, targetWidth: 4, targetHeight: 6 },
    { name: 'right-arm', sourceX: 6, sourceY: 8, sourceWidth: 2, sourceHeight: 6, targetX: 40, targetY: 16, targetWidth: 4, targetHeight: 6 },
    { name: 'left-arm', sourceX: 0, sourceY: 8, sourceWidth: 2, sourceHeight: 6, targetX: 32, targetY: 48, targetWidth: 4, targetHeight: 6 },
    { name: 'right-leg', sourceX: 4, sourceY: 14, sourceWidth: 2, sourceHeight: 6, targetX: 0, targetY: 16, targetWidth: 4, targetHeight: 6 },
    { name: 'left-leg', sourceX: 2, sourceY: 14, sourceWidth: 2, sourceHeight: 6, targetX: 16, targetY: 48, targetWidth: 4, targetHeight: 6 },
  ],
};

export const CARTOON_TO_SKIN_MAPPING = {
  headRatio: 0.35,
  bodyRatio: 0.25,
  armsRatio: 0.20,
  legsRatio: 0.20,
};
