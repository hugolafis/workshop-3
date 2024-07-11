import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { LootType } from "./game-state";

export class AssetManager {
  models = new Map();
  textures = new Map();
  audioBuffers = new Map();
  lootMap = new Map<LootType, string[]>(); // loot type to loot names, where name is key in the models map

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
    const audioLoader = new THREE.AudioLoader(this.loadingManager);

    this.loadTextures(textureLoader);
    this.loadModels(gltfLoader, fbxLoader);
    this.loadAudio(audioLoader);

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
      gltf.scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.castShadow = true;
          obj.receiveShadow = true;
        }
      });
      this.models.set("level", gltf.scene);
    });

    // chest body

    const chestBodyUrl = new URL("/models/chestBody.fbx", import.meta.url).href;
    fbxLoader.load(chestBodyUrl, (group) => {
      // Apply standard material to receive rect light
      group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.material = new THREE.MeshStandardMaterial();
          child.castShadow = true;
        }
      });

      this.models.set("chest-body", group);
    });

    // chest lid

    const chestLidUrl = new URL("/models/chestLid.fbx", import.meta.url).href;
    fbxLoader.load(chestLidUrl, (group) => {
      // Apply standard material to receive rect light
      group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.material = new THREE.MeshStandardMaterial();
          child.castShadow = true;
        }
      });
      this.models.set("chest-lid", group);
    });

    // coins

    const coinsUrl = new URL("/models/SM_Item_Coins_04.fbx", import.meta.url)
      .href;
    fbxLoader.load(coinsUrl, (group) =>
      this.addLootModel("coins", LootType.GOLD, group)
    );

    // potions

    const potion1Url = new URL("/models/SM_Item_Potion_02.fbx", import.meta.url)
      .href;
    fbxLoader.load(potion1Url, (group) =>
      this.addLootModel("potion-1", LootType.POTION, group)
    );

    const potion2Url = new URL("/models/SM_Item_Potion_05.fbx", import.meta.url)
      .href;
    fbxLoader.load(potion2Url, (group) =>
      this.addLootModel("potion-2", LootType.POTION, group)
    );

    const potion3Url = new URL("/models/SM_Item_Potion_07.fbx", import.meta.url)
      .href;
    fbxLoader.load(potion3Url, (group) =>
      this.addLootModel("potion-3", LootType.POTION, group)
    );

    // axes

    const axe1Url = new URL("/models/SM_Wep_Axe_Nature_01.fbx", import.meta.url)
      .href;
    fbxLoader.load(axe1Url, (group) =>
      this.addLootModel("axe-1", LootType.WEAPON, group)
    );

    const axe2Url = new URL(
      "/models/SM_Wep_Crystal_Axe_01.fbx",
      import.meta.url
    ).href;
    fbxLoader.load(axe2Url, (group) =>
      this.addLootModel("axe-2", LootType.WEAPON, group)
    );

    const axe3Url = new URL("/models/SM_Wep_Ornate_Axe_01.fbx", import.meta.url)
      .href;
    fbxLoader.load(axe3Url, (group) =>
      this.addLootModel("axe-3", LootType.WEAPON, group)
    );

    // swords

    const sword1Url = new URL("/models/SM_Wep_Cutlass_01.fbx", import.meta.url)
      .href;
    fbxLoader.load(sword1Url, (group) =>
      this.addLootModel("sword-1", LootType.WEAPON, group)
    );

    const sword2Url = new URL(
      "/models/SM_Wep_Ornate_Sword_01.fbx",
      import.meta.url
    ).href;
    fbxLoader.load(sword2Url, (group) =>
      this.addLootModel("sword-2", LootType.WEAPON, group)
    );

    const sword3Url = new URL(
      "/models/SM_Wep_Straightsword_01.fbx",
      import.meta.url
    ).href;
    fbxLoader.load(sword3Url, (group) =>
      this.addLootModel("sword-3", LootType.WEAPON, group)
    );

    // hammers

    const hammer1Url = new URL(
      "/models/SM_Wep_Hammer_Mace_Spikes_01.fbx",
      import.meta.url
    ).href;
    fbxLoader.load(hammer1Url, (group) =>
      this.addLootModel("hammer-1", LootType.WEAPON, group)
    );

    const hammer2Url = new URL(
      "/models/SM_Wep_Hammer_Small_01.fbx",
      import.meta.url
    ).href;
    fbxLoader.load(hammer2Url, (group) =>
      this.addLootModel("hammer-2", LootType.WEAPON, group)
    );

    const hammer3Url = new URL(
      "/models/SM_Wep_Ornate_Spikes_01.fbx",
      import.meta.url
    ).href;
    fbxLoader.load(hammer3Url, (group) =>
      this.addLootModel("hammer-3", LootType.WEAPON, group)
    );

    // shields

    const shield1Url = new URL(
      "/models/SM_Wep_Shield_Heater_01.fbx",
      import.meta.url
    ).href;
    fbxLoader.load(shield1Url, (group) =>
      this.addLootModel("shield-1", LootType.SHIELD, group)
    );

    const shield2Url = new URL(
      "/models/SM_Wep_Shield_Ornate_02.fbx",
      import.meta.url
    ).href;
    fbxLoader.load(shield2Url, (group) =>
      this.addLootModel("shield-2", LootType.SHIELD, group)
    );

    const shield3Url = new URL(
      "/models/SM_Wep_Shield_Plank_01.fbx",
      import.meta.url
    ).href;
    fbxLoader.load(shield3Url, (group) =>
      this.addLootModel("shield-3", LootType.SHIELD, group)
    );
  }

  private addLootModel(name: string, lootType: LootType, group: THREE.Group) {
    // Ideally we want the origin point of each object to be at its base
    // This will make it easier to place objects on the same y level
    const child = group.children[0];

    const bounds = new THREE.Box3().setFromObject(child);
    const minY = bounds.min.y;

    const difference = child.position.y - minY;
    child.position.y += difference;

    this.models.set(name, group);

    const existing = this.lootMap.get(lootType) ?? [];
    existing.push(name);
    this.lootMap.set(lootType, existing);
  }

  private loadTextures(textureLoader: THREE.TextureLoader) {
    // dungeon 1 atlas

    const d1Url = new URL("/textures/Dungeons_Texture_01.png", import.meta.url)
      .href;
    const d1Texture = textureLoader.load(d1Url);
    d1Texture.encoding = THREE.sRGBEncoding;
    this.textures.set("d1-atlas", d1Texture);

    const d2Url = new URL("/textures/Dungeons_Texture_02.png", import.meta.url)
      .href;
    const d2Texture = textureLoader.load(d2Url);
    d2Texture.encoding = THREE.sRGBEncoding;
    this.textures.set("d2-atlas", d2Texture);

    const d3Url = new URL("/textures/Dungeons_Texture_03.png", import.meta.url)
      .href;
    const d3Texture = textureLoader.load(d3Url);
    d3Texture.encoding = THREE.sRGBEncoding;
    this.textures.set("d3-atlas", d3Texture);

    const d4Url = new URL("/textures/Dungeons_Texture_04.png", import.meta.url)
      .href;
    const d4Texture = textureLoader.load(d4Url);
    d4Texture.encoding = THREE.sRGBEncoding;
    this.textures.set("d4-atlas", d4Texture);
  }

  private loadAudio(loader: THREE.AudioLoader) {
    const chestImpactUrl = new URL(
      "/audio/Wooden Crate Impact Normal.wav",
      import.meta.url
    ).href;
    loader.load(chestImpactUrl, (buffer) =>
      this.audioBuffers.set("chest-impact", buffer)
    );

    const chestOpenUrl = new URL(
      "/audio/Open Container Wood D.wav",
      import.meta.url
    ).href;
    loader.load(chestOpenUrl, (buffer) =>
      this.audioBuffers.set("chest-open", buffer)
    );

    const bottleUrl = new URL("/audio/Pick Up Bottle D.wav", import.meta.url)
      .href;
    loader.load(bottleUrl, (buffer) =>
      this.audioBuffers.set("pick-up-potion", buffer)
    );

    const shieldUrl = new URL("/audio/Pick Up Equipment E.wav", import.meta.url)
      .href;
    loader.load(shieldUrl, (buffer) =>
      this.audioBuffers.set("pick-up-shield", buffer)
    );

    const goldUrl = new URL("/audio/Pick Up Jewlery A.wav", import.meta.url)
      .href;
    loader.load(goldUrl, (bufffer) =>
      this.audioBuffers.set("pick-up-gold", bufffer)
    );

    const weaponUrl = new URL("/audio/Pick Up Metal D.wav", import.meta.url)
      .href;
    loader.load(weaponUrl, (buffer) =>
      this.audioBuffers.set("pick-up-weapon", buffer)
    );
  }
}
