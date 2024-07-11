import * as THREE from "three";

export interface LightCylinderParams {
  color?: THREE.Color;
  fadeHeight?: number;
}

export class LightCylinder extends THREE.ShaderMaterial {
  private readonly glowColor: THREE.IUniform<THREE.Color> = {
    value: new THREE.Color(),
  };
  private readonly fadeHeight: THREE.IUniform<number> = {
    value: 1,
  };

  set color(color: THREE.Color) {
    this.glowColor.value = color;
  }

  constructor(params?: LightCylinderParams) {
    super();

    this.glowColor.value = params?.color ?? new THREE.Color();
    this.fadeHeight.value = params?.fadeHeight ?? 1.0;

    this.glslVersion = THREE.GLSL3;
    this.transparent = true;
    this.side = THREE.DoubleSide;

    this.uniforms = {
      glowColor: this.glowColor,
      fadeHeight: this.fadeHeight,
    };

    this.vertexShader = `

      //out float fadeAlpha;
      out vec3 vPosition;

      void main() {
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    this.fragmentShader = `
      layout(location = 0) out vec4 color;

      uniform vec3 glowColor;
      uniform float fadeHeight;

      in vec3 vPosition;
      //in float fadeAlpha;

      void main() {
        // 1 - Math.pow(1 - x, 3);
        float fade = vPosition.y / fadeHeight;
        float fadeAlpha = mix(1.0, 0.0, 1.0 - pow(1.0 - fade, 5.0));
        color = vec4(glowColor, fadeAlpha);
      }
    `;
  }
}
