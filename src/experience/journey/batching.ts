import * as THREE from "three";

/** Batch rigid siblings, leaving animated parent groups and material boundaries intact. */
export function batchRigidMeshes(root: THREE.Object3D) {
  const batches: THREE.InstancedMesh[] = [];
  const visit = (parent: THREE.Object3D) => {
    const candidates = new Map<string, THREE.Mesh[]>();
    for (const child of [...parent.children]) {
      visit(child);
      if (!(child instanceof THREE.Mesh) || child instanceof THREE.InstancedMesh
        || Array.isArray(child.material) || child.children.length) continue;
      child.updateMatrix();
      child.matrixAutoUpdate = false;
      const key = `${child.geometry.uuid}/${child.material.uuid}/${child.castShadow}/${child.receiveShadow}/${child.renderOrder}`;
      const siblings = candidates.get(key) ?? [];
      siblings.push(child);
      candidates.set(key, siblings);
    }
    for (const siblings of candidates.values()) {
      if (siblings.length < 2) continue;
      const first = siblings[0];
      const material = first.material as THREE.Material;
      const batch = new THREE.InstancedMesh(first.geometry, material, siblings.length);
      batch.name = `Rigid instances / ${material.name || material.type}`;
      batch.castShadow = first.castShadow;
      batch.receiveShadow = first.receiveShadow;
      batch.renderOrder = first.renderOrder;
      batch.layers.mask = first.layers.mask;
      siblings.forEach((mesh, index) => {
        batch.setMatrixAt(index, mesh.matrix);
        mesh.removeFromParent();
      });
      batch.instanceMatrix.setUsage(THREE.StaticDrawUsage);
      batch.instanceMatrix.needsUpdate = true;
      batch.computeBoundingBox();
      batch.computeBoundingSphere();
      batch.updateMatrix();
      batch.matrixAutoUpdate = false;
      parent.add(batch);
      batches.push(batch);
    }
  };
  visit(root);
  return () => batches.forEach(batch => batch.dispose());
}
