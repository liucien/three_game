import * as THREE from 'threejs/three.js';
import BasicRubik from './object/Rubik.js';
import TouchLine from './object/TouchLine.js';
import './threejs/OrbitControls.js';
const Context = canvas.getContext('webgl');

export default class Main {
  constructor() {
    this.context = Context;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.devicePixeRatio = window.devicePixelRatio; //返回当前显示设备的物理像素分辨率与CSS像素分辨率的比值
    this.viewCenter = new THREE.Vector3(0, 0, 0); //原点
    this.frontViewName = 'front-rubik'; //正视角魔方名称
    this.endViewName = 'end-rubik'; //反视角魔方名称
    this.minPercent = 0.25; //最少视图占比25%

    this.raycaster = new THREE.Raycaster(); //光线投射：鼠标拾取，计算在三维空间内鼠标移动过什么物体
    //执行new THREE.Raycaster()即可创建碰撞射线对象，同时定义一些其它的相关变量:
    this.intersect; // 转动时手指触碰的小方块
    this.normalize; //转动时手指触碰的平面法向量
    this.targetRubik; //转动时手指触碰的魔方
    this.anotherRubik; //转动时手指没触碰的魔方
    this.startPoint; //触摸点
    this.movePoint; //滑动点
    this.isRotating = false; //魔方是否转动

    this.initRender(); //渲染器
    this.initCamera(); //相机
    this.initScene(); //场景
    this.initLight(); //光照
    this.initObject(); //物体
    this.initEvent(); //触控条事件
    this.render(); //渲染函数
  }

  initRender() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      context: this.context
    });

    this.renderer.setSize(this.width, this.height);
    this.renderer.setClearColor(0xffffff, 1.0);
    canvas.width = this.width * this.devicePixeRatio;
    canvas.height = this.height * this.devicePixeRatio;
    this.renderer.setPixelRatio(this.devicePixeRatio);

  }

  initCamera() {
    this.camera = new THREE.PerspectiveCamera(45, this.width / this.height, 1, 1500);
    this.camera.position.set(0, 0, 300 / this.camera.aspect);
    this.camera.up.set(0, 1, 0); //正方向
    this.camera.lookAt(this.viewCenter);

    // this.orbitController = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    // this.orbitController.enableZoom = false;
    // this.orbitController.rotateSpeed = 2;
    // this.orbitController.target = this.viewCenter; //设置控制点

    this.originHeight = Math.tan(22.5 / 180 * Math.PI) * this.camera.position.z * 2;
    this.originWidth = this.originHeight * this.camera.aspect;
  }

  initScene() {
    this.scene = new THREE.Scene();
  }

  initLight() {
    this.light = new THREE.AmbientLight(0xfefefe);
    this.scene.add(this.light);
  }

  initObject() {
    //单个魔方
    // let rubik = new BasicRubik(this);
    // rubik.model();

    //正视魔方
    this.frontRubik = new BasicRubik(this);
    this.frontRubik.model(this.frontViewName);
    this.frontRubik.resizeHeight(0.5, 1);

    //反视魔方
    this.endRubik = new BasicRubik(this);
    this.endRubik.model(this.endViewName);
    this.endRubik.resizeHeight(0.5, -1);

    //操纵条
    this.touchLine = new TouchLine(this);
    this.rubikResize((1 - this.minPercent), this.minPercent); //默认正视图占85%区域，反视图占15%区域
  }

  render() {
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
    window.requestAnimationFrame(this.render.bind(this), canvas)
  }

  //触控事件
  initEvent() {
    wx.onTouchStart(this.touchStart.bind(this));
    wx.onTouchMove(this.touchMove.bind(this));
    wx.onTouchEnd(this.touchEnd.bind(this));
  }
  //开始触摸
  touchStart(event) {
    let touch = event.touches[0];
    this.startPoint = touch;
    if (this.touchLine.isHover(touch)) {
      this.touchLine.enable();
    } else {
      this.getIntersects(event);
      if (!this.isRotating && this.intersect) { //触摸点在魔方上且魔方没有转动
        this.startPoint = this.intersect.point; //开始转动，设置起点
      }
    }
  }
  //触摸移动
  touchMove(event) {
    let touch = event.touches[0];
    if (this.touchLine.isActive) { //滑动touchline
      this.touchLine.move(touch.clientY);
      let frontPercent = touch.clientY / window.innerHeight;
      let endPercent = 1 - frontPercent;
      this.rubikResize(frontPercent, endPercent);
    } else {
      this.getIntersects(event);
			if (!this.isRotating && this.startPoint && this.intersect) {
        this.movePoint = this.intersect.point;
				//equals() 检查该向量和v3的严格相等性。
				if (!this.movePoint.equals(this.startPoint)) {
          this.rotateRubik();
        }
      }
    }
  }
  //结束触摸
  touchEnd(event) {
    this.touchLine.disable();
  }

	//转动魔方
	rotateRubik(){
		//sub() 从该向量减去向量v
		this.isRotating = true;//转动标识置为true
		console.log(this.movePoint)
		let sub = this.movePoint.sub(this.startPoint);//计算滑动方向
		console.log(sub)
		let direction = this.targetRubik.getDirection(sub, this.normalize);//计算转动方向
		let cubeIndex = this.intersect.object.cubeIndex;
		this.targetRubik.rotateMove(cubeIndex, direction);
		let anotherIndex = cubeIndex - this.targetRubik.minCubeIndex + this.anotherRubik.minCubeIndex;
		this.anotherRubik.rotateMove(anotherIndex, direction, () => {
			this.resetRotateParams();
		});
	}

	//重置魔方参数
	resetRotateParams() {
		this.isRotating = false;
		this.targetRubik = null;
		this.anotherRubik = null;
		this.intersect = null;
		this.normalize = null;
		this.startPoint = null;
		this.movePoint = null;
	}

  //正反魔方区域占比变化
  rubikResize(frontPercent, endPercent) {
    this.frontRubik.resizeHeight(frontPercent, 1);
    this.endRubik.resizeHeight(endPercent, -1);
  }

  getIntersects(event) {
    let touch = event.touches[0];

    //归一化
    let mouse = new THREE.Vector2();
    mouse.x = (touch.clientX / this.width) * 2 - 1;
    mouse.y = -(touch.clientY / this.height) * 2 + 1;
    this.raycaster.setFromCamera(mouse, this.camera); //使用一个新的原点和方向来更新射线

    //魔方正反面检测，只需要更新一个面
    let rubikTypeName;
    if (this.touchLine.screenRect.top > touch.clientY) {
      this.targetRubik = this.frontRubik;
      this.anotherRubik = this.endRubik;
      rubikTypeName = this.frontViewName;
    } else if (this.touchLine.screenRect.top + this.touchLine.screenRect.height < touch.clientY) {
      this.targetRubik = this.endRubik;
      this.anotherRubik = this.frontRubik;
      rubikTypeName = this.endViewName;
    }

    let targetIntersect;
    for (let i = 0; i < this.scene.children.length; i++) {
      if (this.scene.children[i].childType == rubikTypeName) {
        targetIntersect = this.scene.children[i];
        break;
      }
    }

 		//获得触摸物体
		if (targetIntersect) {
			let intersects = this.raycaster.intersectObjects(targetIntersect.children);
			if (intersects.length >= 2) {
				if (intersects[0].object.cubeType === 'coverCube') {
					this.intersect = intersects[1];
					this.normalize = intersects[0].face.normal;
				} else {
					this.intersect = intersects[0];
					this.normalize = intersects[1].face.normal;
				}
			}
		}
  }
}