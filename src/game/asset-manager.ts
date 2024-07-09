import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

export class AssetManager {
  models = new Map();
  textures = new Map();
  lootNames: string[] = [];

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

    this.loadTextures(textureLoader);
    this.loadModels(gltfLoader, fbxLoader);

    return new Promise((resolve) => {
      this.loadingManager.onLoad = () => {
        resolve();
      };
    });
  }

  private loadModels(gltfLoader: GLTFLoader, fbxLoader: FBXLoader) {
    // level

    const levelUrl = new URL("/models/lootBoxScene.glb", import.meta.url).href;
    gltfLoader.load(levelUrl, (gltf) => this.models.set("level", gltf.scene));

    // chest body

    const chestBodyUrl = new URL("/models/chestBody.fbx", import.meta.url).href;
    fbxLoader.load(chestBodyUrl, (group) =>
      this.models.set("chest-body", group)
    );

    // chest lid

    const chestLidUrl = new URL("/models/chestLid.fbx", import.meta.url).href;
    fbxLoader.load(chestLidUrl, (group) => this.models.set("chest-lid", group));

    // coins

    const coinsUrl = new URL("/models/SM_Item_Coins_04.fbx", import.meta.url)
      .href;
    fbxLoader.load(coinsUrl, (group) => this.addLoadedModel("coins", group));

    // potions

    const potion1Url = new URL("/models/SM_Item_Potion_02.fbx", import.meta.url)
      .href;
    fbxLoader.load(potion1Url, (group) =>
      this.addLoadedModel("potion-1", group)
    );

    const potion2Url = new URL("/models/SM_Item_Potion_05.fbx", import.meta.url)
      .href;
    fbxLoader.load(potion2Url, (group) =>
      this.addLoadedModel("potion-2", group)
    );

    const potion3Url = new URL("/models/SM_Item_Potion_07.fbx", import.meta.url)
      .href;
    fbxLoader.load(potion3Url, (group) =>
      this.addLoadedModel("potion-3", group)
    );

    // axes

    const axe1Url = new URL("/models/SM_Wep_Axe_Nature_01.fbx", import.meta.url)
      .href;
    fbxLoader.load(axe1Url, (group) => this.addLoadedModel("axe-1", group));

    const axe2Url = new URL(
      "/models/SM_Wep_Crystal_Axe_01.fbx",
      import.meta.url
    ).href;
    fbxLoader.load(axe2Url, (group) => this.addLoadedModel("axe-2", group));

    const axe3Url = new URL("/models/SM_Wep_Ornate_Axe_01.fbx", import.meta.url)
      .href;
    fbxLoader.load(axe3Url, (group) => this.addLoadedModel("axe-3", group));

    // swords

    const sword1Url = new URL("/models/SM_Wep_Cutlass_01.fbx", import.meta.url)
      .href;
    fbxLoader.load(sword1Url, (group) => this.addLoadedModel("sword-1", group));

    const sword2Url = new URL(
      "/models/SM_Wep_Ornate_Sword_01.fbx",
      import.meta.url
    ).href;
    fbxLoader.load(sword2Url, (group) => this.addLoadedModel("sword-2", group));

    const sword3Url = new URL(
      "/models/SM_Wep_Straightsword_01.fbx",
      import.meta.url
    ).href;
    fbxLoader.load(sword3Url, (group) => this.addLoadedModel("sword-3", group));

    // hammers

    const hammer1Url = new URL(
      "/models/SM_Wep_Hammer_Mace_Spikes_01.fbx",
      import.meta.url
    ).href;
    fbxLoader.load(hammer1Url, (group) =>
      this.addLoadedModel("hammer-1", group)
    );

    const hammer2Url = new URL(
      "/models/SM_Wep_Hammer_Small_01.fbx",
      import.meta.url
    ).href;
    fbxLoader.load(hammer2Url, (group) =>
      this.addLoadedModel("hammer-2", group)
    );

    const hammer3Url = new URL(
      "/models/SM_Wep_Ornate_Spikes_01.fbx",
      import.meta.url
    ).href;
    fbxLoader.load(hammer3Url, (group) =>
      this.addLoadedModel("hammer-3", group)
    );

    // shields

    const shield1Url = new URL(
      "/models/SM_Wep_Shield_Heater_01.fbx",
      import.meta.url
    ).href;
    fbxLoader.load(shield1Url, (group) =>
      this.addLoadedModel("shield-1", group)
    );

    const shield2Url = new URL(
      "/models/SM_Wep_Shield_Ornate_02.fbx",
      import.meta.url
    ).href;
    fbxLoader.load(shield2Url, (group) =>
      this.addLoadedModel("shield-2", group)
    );

    const shield3Url = new URL(
      "/models/SM_Wep_Shield_Plank_01.fbx",
      import.meta.url
    ).href;
    fbxLoader.load(shield3Url, (group) =>
      this.addLoadedModel("shield-3", group)
    );
  }

  private addLoadedModel(name: string, group: THREE.Group) {
    // Ideally we want the origin point of each object to be at its base
    // This will make it easier to place objects on the same y level
    const child = group.children[0];

    const bounds = new THREE.Box3().setFromObject(child);
    const minY = bounds.min.y;

    const difference = child.position.y - minY;
    child.position.y += difference;

    this.models.set(name, group);
    this.lootNames.push(name);
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
