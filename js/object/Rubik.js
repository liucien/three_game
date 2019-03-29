import * as THREE from '../threejs/three.js';


const BasicParams = {
  x: 0,
  y: 0,
  z: 0,
  num: 3,
  len: 50,
  colors: [
    '#ff6b02', '#dd422f',
    '#ffffff', '#fdcd02',
    '#3d81f7', '#019d53'
  ]
}

function SimpleCube(x, y, z, num, len, colors) {
  let leftUpX = x - num / 2 * len;
  let leftUpY = y + num / 2 * len;
  let leftUpZ = z + num / 2 * len;

  let cubes = [];
  for (let i = 0; i < num; i++) {
    for (let j = 0; j < num * num; j++) {

      let myFaces = [];
      for (let k = 0; k < 6; k++) {
        myFaces[k] = faces(BasicParams.colors[k]);
      }

      let materials = [];
      for (let k = 0; k < 6; k++) {
        let texture = new THREE.Texture(myFaces[k]);
        texture.needsUpdate = true;
        materials.push(new THREE.MeshLambertMaterial({
          map: texture
        }));
      }

      let cubegeo = new THREE.BoxGeometry(len, len, len);
      let cube = new THREE.Mesh(cubegeo, materials);

      //依次计算各个小方块中心点坐标
      cube.position.x = (leftUpX + len / 2) + (j % num) * len;
      cube.position.y = (leftUpY - len / 2) - parseInt(j / num) * len;
      cube.position.z = (leftUpZ - len / 2) - i * len;
      cubes.push(cube);

    }
  }
  return cubes
}


function faces(rgbaColor) {

  let canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;

  let context = canvas.getContext('2d');
  context.fillStyle = 'rgba(0,0,01)';
  context.fillRect(0, 0, 256, 256);

  context.rect(16, 16, 224, 224);
  context.lineJoin = 'round';
  context.lineWidth = 16;
  context.fillStyle = rgbaColor;
  context.strokeStyle = rgbaColor;
  context.stroke();
  context.fill();

  return canvas;
}

export default class Rubik {
  constructor(main) {
    this.main = main;
  }

  model(type) {
    //创建魔方组
    this.group = new THREE.Group();
    this.group.childType = type;

    //创建27个小方块(网格模型集合)
    this.cubes = SimpleCube(
      BasicParams.x,
      BasicParams.y,
      BasicParams.z,
      BasicParams.num,
      BasicParams.len,
      BasicParams.colors
    )

    for (let i = 0; i < this.cubes.length; i++) {
      let item = this.cubes[i];
      this.group.add(item)

      /**
       * 小方块不再直接加入场景了；
       * 而是先加入魔方集合，然后再把魔方集合加入场景。
       */
      // this.main.scene.add(item);
    }
		
		//外层透明正方体
		let width = BasicParams.num * BasicParams.len;
		let cubegeo = new THREE.BoxGeometry(width, width, width);
		let hex = 0x000000;
		for (let i = 0; i < cubegeo.faces.length; i += 2) {
			cubegeo.faces[i].color.setHex(hex);
			cubegeo.faces[i + 1].color.setHex(hex);
		}
		let cubemat = new THREE.MeshBasicMaterial({ vertexColors: THREE.FaceColors, opacity: 0, transparent: true });
		this.container = new THREE.Mesh(cubegeo, cubemat);
		this.container.cubeType = 'coverCube';
		this.group.add(this.container);

    //进行一定的旋转变换保证三个面可见
    if (type === this.main.frontViewName) {
      this.group.rotateY(45 / 180 * Math.PI);
    } else {
      this.group.rotateY((270 - 45) / 180 * Math.PI);
    }
    this.group.rotateOnAxis(new THREE.Vector3(1, 0, 1), 25 / 180 * Math.PI);


    //将组加入场景中
    this.main.scene.add(this.group);

		//辅助线
		this.main.scene.add(new THREE.AxesHelper(500))
		this.group.add(new THREE.AxesHelper(500))
  }

  resizeHeight(percent, transformTag) {
    if (percent < this.main.minPercent) {
      percent = this.main.minPercent;
    }

    if (percent > 1 - this.main.minPercent) {
      percent = 1 - this.main.minPercent;
    }

    //缩放比例
    this.group.scale.set(percent, percent, percent);
    //y轴移动位置
    this.group.position.y = this.main.originHeight * (0.5 - percent / 2) * transformTag;
  }
}