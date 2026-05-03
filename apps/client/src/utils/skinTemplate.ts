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
  head: { name: '头部', x: 8, y: 8, width: 8, height: 8 },
  body: { name: '身体', x: 20, y: 20, width: 8, height: 12 },
  leftArm: { name: '左臂', x: 36, y: 52, width: 4, height: 12 },
  rightArm: { name: '右臂', x: 44, y: 20, width: 4, height: 12 },
  leftLeg: { name: '左腿', x: 20, y: 52, width: 4, height: 12 },
  rightLeg: { name: '右腿', x: 4, y: 20, width: 4, height: 12 },
};

export const MINECRAFT_SKIN_TEMPLATE: SkinTemplate = {
  name: 'Standard Minecraft Skin',
  description: '标准Minecraft皮肤模板 (64x64)',
  regions: [
    { name: 'head-top', sourceX: 0, sourceY: 0, sourceWidth: 8, sourceHeight: 8, targetX: 8, targetY: 0, targetWidth: 8, targetHeight: 8 },
    { name: 'head-bottom', sourceX: 0, sourceY: 0, sourceWidth: 8, sourceHeight: 8, targetX: 16, targetY: 0, targetWidth: 8, targetHeight: 8 },
    { name: 'head-right', sourceX: 0, sourceY: 0, sourceWidth: 8, sourceHeight: 8, targetX: 0, targetY: 8, targetWidth: 8, targetHeight: 8 },
    { name: 'head-front', sourceX: 0, sourceY: 0, sourceWidth: 8, sourceHeight: 8, targetX: 8, targetY: 8, targetWidth: 8, targetHeight: 8 },
    { name: 'head-left', sourceX: 0, sourceY: 0, sourceWidth: 8, sourceHeight: 8, targetX: 16, targetY: 8, targetWidth: 8, targetHeight: 8 },
    { name: 'head-back', sourceX: 0, sourceY: 0, sourceWidth: 8, sourceHeight: 8, targetX: 24, targetY: 8, targetWidth: 8, targetHeight: 8 },
    { name: 'body-top', sourceX: 20, sourceY: 20, sourceWidth: 8, sourceHeight: 12, targetX: 20, targetY: 16, targetWidth: 8, targetHeight: 4 },
    { name: 'body-bottom', sourceX: 20, sourceY: 20, sourceWidth: 8, sourceHeight: 12, targetX: 28, targetY: 16, targetWidth: 8, targetHeight: 4 },
    { name: 'body-right', sourceX: 20, sourceY: 20, sourceWidth: 8, sourceHeight: 12, targetX: 16, targetY: 20, targetWidth: 4, targetHeight: 12 },
    { name: 'body-front', sourceX: 20, sourceY: 20, sourceWidth: 8, sourceHeight: 12, targetX: 20, targetY: 20, targetWidth: 8, targetHeight: 12 },
    { name: 'body-left', sourceX: 20, sourceY: 20, sourceWidth: 8, sourceHeight: 12, targetX: 28, targetY: 20, targetWidth: 4, targetHeight: 12 },
    { name: 'body-back', sourceX: 20, sourceY: 20, sourceWidth: 8, sourceHeight: 12, targetX: 32, targetY: 20, targetWidth: 8, targetHeight: 12 },
    { name: 'right-arm-top', sourceX: 44, sourceY: 20, sourceWidth: 4, sourceHeight: 12, targetX: 44, targetY: 16, targetWidth: 4, targetHeight: 4 },
    { name: 'right-arm-bottom', sourceX: 44, sourceY: 20, sourceWidth: 4, sourceHeight: 12, targetX: 48, targetY: 16, targetWidth: 4, targetHeight: 4 },
    { name: 'right-arm-right', sourceX: 44, sourceY: 20, sourceWidth: 4, sourceHeight: 12, targetX: 40, targetY: 20, targetWidth: 4, targetHeight: 12 },
    { name: 'right-arm-front', sourceX: 44, sourceY: 20, sourceWidth: 4, sourceHeight: 12, targetX: 44, targetY: 20, targetWidth: 4, targetHeight: 12 },
    { name: 'right-arm-left', sourceX: 44, sourceY: 20, sourceWidth: 4, sourceHeight: 12, targetX: 48, targetY: 20, targetWidth: 4, targetHeight: 12 },
    { name: 'right-arm-back', sourceX: 44, sourceY: 20, sourceWidth: 4, sourceHeight: 12, targetX: 52, targetY: 20, targetWidth: 4, targetHeight: 12 },
    { name: 'left-arm-top', sourceX: 36, sourceY: 52, sourceWidth: 4, sourceHeight: 12, targetX: 36, targetY: 48, targetWidth: 4, targetHeight: 4 },
    { name: 'left-arm-bottom', sourceX: 36, sourceY: 52, sourceWidth: 4, sourceHeight: 12, targetX: 40, targetY: 48, targetWidth: 4, targetHeight: 4 },
    { name: 'left-arm-right', sourceX: 36, sourceY: 52, sourceWidth: 4, sourceHeight: 12, targetX: 32, targetY: 52, targetWidth: 4, targetHeight: 12 },
    { name: 'left-arm-front', sourceX: 36, sourceY: 52, sourceWidth: 4, sourceHeight: 12, targetX: 36, targetY: 52, targetWidth: 4, targetHeight: 12 },
    { name: 'left-arm-left', sourceX: 36, sourceY: 52, sourceWidth: 4, sourceHeight: 12, targetX: 40, targetY: 52, targetWidth: 4, targetHeight: 12 },
    { name: 'left-arm-back', sourceX: 36, sourceY: 52, sourceWidth: 4, sourceHeight: 12, targetX: 44, targetY: 52, targetWidth: 4, targetHeight: 12 },
    { name: 'right-leg-top', sourceX: 4, sourceY: 20, sourceWidth: 4, sourceHeight: 12, targetX: 4, targetY: 16, targetWidth: 4, targetHeight: 4 },
    { name: 'right-leg-bottom', sourceX: 4, sourceY: 20, sourceWidth: 4, sourceHeight: 12, targetX: 8, targetY: 16, targetWidth: 4, targetHeight: 4 },
    { name: 'right-leg-right', sourceX: 4, sourceY: 20, sourceWidth: 4, sourceHeight: 12, targetX: 0, targetY: 20, targetWidth: 4, targetHeight: 12 },
    { name: 'right-leg-front', sourceX: 4, sourceY: 20, sourceWidth: 4, sourceHeight: 12, targetX: 4, targetY: 20, targetWidth: 4, targetHeight: 12 },
    { name: 'right-leg-left', sourceX: 4, sourceY: 20, sourceWidth: 4, sourceHeight: 12, targetX: 8, targetY: 20, targetWidth: 4, targetHeight: 12 },
    { name: 'right-leg-back', sourceX: 4, sourceY: 20, sourceWidth: 4, sourceHeight: 12, targetX: 12, targetY: 20, targetWidth: 4, targetHeight: 12 },
    { name: 'left-leg-top', sourceX: 20, sourceY: 52, sourceWidth: 4, sourceHeight: 12, targetX: 20, targetY: 48, targetWidth: 4, targetHeight: 4 },
    { name: 'left-leg-bottom', sourceX: 20, sourceY: 52, sourceWidth: 4, sourceHeight: 12, targetX: 24, targetY: 48, targetWidth: 4, targetHeight: 4 },
    { name: 'left-leg-right', sourceX: 20, sourceY: 52, sourceWidth: 4, sourceHeight: 12, targetX: 16, targetY: 52, targetWidth: 4, targetHeight: 12 },
    { name: 'left-leg-front', sourceX: 20, sourceY: 52, sourceWidth: 4, sourceHeight: 12, targetX: 20, targetY: 52, targetWidth: 4, targetHeight: 12 },
    { name: 'left-leg-left', sourceX: 20, sourceY: 52, sourceWidth: 4, sourceHeight: 12, targetX: 24, targetY: 52, targetWidth: 4, targetHeight: 12 },
    { name: 'left-leg-back', sourceX: 20, sourceY: 52, sourceWidth: 4, sourceHeight: 12, targetX: 28, targetY: 52, targetWidth: 4, targetHeight: 12 },
  ],
};

export const CARTOON_TO_SKIN_MAPPING = {
  headRatio: 0.35,
  bodyRatio: 0.25,
  armsRatio: 0.20,
  legsRatio: 0.20,
};
