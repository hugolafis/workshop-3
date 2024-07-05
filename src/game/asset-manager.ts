import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

export class AssetManager {
  models = new Map();
  textures = new Map();

  private loadingManager = new THREE.LoadingManager();

  applyModelTexture(model: THREE.Object3D, textureName: string) {
    const texture = this.textures.get(textureName);
    if (!texture) {
      return;
    }

    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material.map = texture;
      }
    });
  }

  load(): Promise<void> {
    const gltfLoader = new GLTFLoader(this.loadingManager);
    const fbxLoader = new FBXLoader(this.loadingManager);
    const textureLoader = new THREE.TextureLoader(this.loadingManager);

    this.loadModels(gltfLoader, fbxLoader);
    this.loadTextures(textureLoader);

    return new Promise((resolve) => {
      this.loadingManager.onLoad = () => {
        resolve();
      };
    });
  }

  private loadModels(gltfLoader: GLTFLoader, fbxLoader: FBXLoader) {
    // level

    const levelUrl = new URL("/models/lootBoxScene.glb", import.meta.url).href;
    gltfLoader.load(levelUrl, (gltf) => {
      this.models.set("level", gltf.scene);
    });

    // chest body

    const chestBodyUrl = new URL("/models/chestBody.fbx", import.meta.url).href;
    fbxLoader.load(chestBodyUrl, (group) => {
      this.models.set("chest-body", group);
    });

    // chest lid

    const chestLidUrl = new URL("/models/chestLid.fbx", import.meta.url).href;
    fbxLoader.load(chestLidUrl, (group) => {
      this.models.set("chest-lid", group);
    });
  }

  private loadTextures(textureLoader: THREE.TextureLoader) {
    // dungeon 1 atlas

    const d1Url = new URL("/textures/Dungeons_Texture_01.png", import.meta.url)
      .href;
    const d1Texture = textureLoader.load(d1Url);
    d1Texture.encoding = THREE.sRGBEncoding;
    this.textures.set("d1-atlas", d1Texture);
  }
}
