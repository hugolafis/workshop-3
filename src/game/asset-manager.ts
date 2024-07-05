import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

export class AssetManager {
  models = new Map();

  private loadingManager = new THREE.LoadingManager();

  load(): Promise<void> {
    const gltfLoader = new GLTFLoader(this.loadingManager);

    this.loadModels(gltfLoader);

    return new Promise((resolve) => {
      this.loadingManager.onLoad = () => {
        resolve();
      };
    });
  }

  private loadModels(gltfLoader: GLTFLoader) {
    const levelUrl = new URL("/models/lootBoxScene.glb", import.meta.url).href;
    gltfLoader.load(levelUrl, (gltf) => {
      this.models.set("level", gltf.scene);
    });
  }
}
