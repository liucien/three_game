import * as THREE from 'threejs/three.js';
import TWEEN from './tween/tween.js';
import BasicRubik from './object/Rubik.js';
import TouchLine from './object/TouchLine.js';
import ResetBtn from './object/ResetBtn.js';
import DisorganizeBtn from './object/DisorganizeBtn.js';
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

    this.enterAnimation(); //初始打乱动画


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

		//透视投影相机视角为垂直视角，根据视角可以求出原点所在裁切面的高度，然后已知高度和宽高比可以计算出宽度
    this.originHeight = Math.tan(22.5 / 180 * Math.PI) * this.camera.position.z * 2;
    this.originWidth = this.originHeight * this.camera.aspect;

		//UI元素逻辑尺寸和屏幕尺寸比率
		this.uiRadio = this.originWidth / window.innerWidth;
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

    this.resetBtn = new ResetBtn(this);
    this.disorganizeBtn = new DisorganizeBtn(this);

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
    if (this.touchLine.isHover(touch)) { //控制条
      this.touchLine.enable();
    } else if (this.resetBtn.isHover(touch) && !this.isRotating) { //重置
      this.resetBtn.enable();
      this.resetRubik();
    } else if (this.disorganizeBtn.isHover(touch) && !this.isRotating) { //打乱
      this.disorganizeBtn.enable();
      this.disorganizeRubik();
    } else {
			//触摸魔方
      this.getIntersects(event);
      if (!this.isRotating && this.intersect) { //触摸点在魔方上且魔方没有转动
        this.startPoint = this.intersect.point; //开始转动，设置起点
      }

      if (!this.isRotating && !this.intersect) { //触摸点没在魔方上
        this.startPoint = new THREE.Vector2(touch.clientX, touch.clientY);
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
      if (!this.isRotating && this.startPoint && this.intersect) { //滑动点在魔方上且魔方没有转动
        this.movePoint = this.intersect.point;
        //equals() 检查该向量和v3的严格相等性。
        if (!this.movePoint.equals(this.startPoint)) { //触摸点和滑动点不一样则意味着可以得到滑动方向
          this.rotateRubik();
        }
      }

      if (!this.isRotating && this.startPoint && !this.intersect) { //触摸点没在魔方上
        this.movePoint = new THREE.Vector2(touch.clientX, touch.clientY);
        if (!this.movePoint.equals(this.startPoint)) {
          this.rotateView();
        }
      }
    }
  }
  //结束触摸
  touchEnd(event) {
		this.resetBtn.disable();
		this.disorganizeBtn.disable();
    this.touchLine.disable();
  }

  //转动魔方
  rotateRubik() {
    //sub() 从该向量减去向量v
    this.isRotating = true; //转动标识置为true
    let sub = this.movePoint.sub(this.startPoint); //计算滑动方向
    let direction = this.targetRubik.getDirection(sub, this.normalize); //计算转动方向
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
      const intersects = this.raycaster.intersectObjects(targetIntersect.children);

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

  //视图转动方向
  getViewDirection(type, startPoint, movePoint) {
    let direction;
    let rad = 30 * Math.PI / 180;
    let lenX = movePoint.x - startPoint.x;
    let lenY = movePoint.y - startPoint.y;
    if (type == this.frontViewName) {
      if (startPoint.x > window.innerWidth / 2) {
        if (Math.abs(lenY) > Math.abs(lenX) * Math.tan(rad)) {
          if (lenY < 0) {
            direction = 2.1;
          } else {
            direction = 3.1;
          }
        } else {
          if (lenX > 0) {
            direction = 0.3;
          } else {
            direction = 1.3;
          }
        }
      } else {
        if (Math.abs(lenY) > Math.abs(lenX) * Math.tan(rad)) {
          if (lenY < 0) {
            direction = 2.4;
          } else {
            direction = 3.4;
          }
        } else {
          if (lenX > 0) {
            direction = 4.4;
          } else {
            direction = 5.4;
          }
        }
      }
    } else {
      if (startPoint.x > window.innerWidth / 2) {
        if (Math.abs(lenY) > Math.abs(lenX) * Math.tan(rad)) {
          if (lenY < 0) {
            direction = 2.2;
          } else {
            direction = 3.2;
          }
        } else {
          if (lenX > 0) {
            direction = 1.4;
          } else {
            direction = 0.4;
          }
        }
      } else {
        if (Math.abs(lenY) > Math.abs(lenX) * Math.tan(rad)) {
          if (lenY < 0) {
            direction = 2.3;
          } else {
            direction = 3.3;
          }
        } else {
          if (lenX > 0) {
            direction = 5.3;
          } else {
            direction = 4.3;
          }
        }
      }
    }
    return direction;
  }

  getViewRotateCubeIndex(type) {
    if (type == this.frontViewName) {
      return 10;
    } else {
      return 65;
    }
  }

  rotateView() {
    if (this.startPoint.y < this.touchLine.screenRect.top) {
      this.targetRubik = this.frontRubik;
      this.anotherRubik = this.endRubik;
    } else if (this.startPoint.y > this.touchLine.screenRect.top + this.touchLine.screenRect.height) {
      this.targetRubik = this.endRubik;
      this.anotherRubik = this.frontRubik;
    }
    if (this.targetRubik && this.anotherRubik) {
      this.isRotating = true; //转动标识置为true
      //计算整体转动方向
      let targetType = this.targetRubik.group.childType;
      let cubeIndex = this.getViewRotateCubeIndex(targetType);
      let direction = this.getViewDirection(targetType, this.startPoint, this.movePoint);
      this.targetRubik.rotateMoveWhole(cubeIndex, direction);
      this.anotherRubik.rotateMoveWhole(cubeIndex, direction, () => {
        this.resetRotateParams();
      });
    }
  }

  enterAnimation() {
    let isAnimationEnd = false;

    let endStatus = { //目标状态
      rotateY: this.frontRubik.group.rotation.y,
      y: this.frontRubik.group.position.y,
      z: this.frontRubik.group.position.z
    }

    //把魔方设置为动画开始状态
    this.frontRubik.group.rotateY(-90 / 180 * Math.PI);
    this.frontRubik.group.position.y += this.originHeight / 3;
    this.frontRubik.group.position.z -= 350;

    let startStatus = { //开始状态
      rotateY: this.frontRubik.group.rotation.y,
      y: this.frontRubik.group.position.y,
      z: this.frontRubik.group.position.z
    }

    let tween = new TWEEN.Tween(startStatus)
      .to(endStatus, 2000)
      .easing(TWEEN.Easing.Quadratic.In)
      .onUpdate(() => {
        this.frontRubik.group.rotation.y = startStatus.rotateY;
        this.frontRubik.group.position.y = startStatus.y
        this.frontRubik.group.position.z = startStatus.z
      }).onComplete(() => {
        isAnimationEnd = true;
      });

    const animate = (time) => {
      if (!isAnimationEnd) {
        requestAnimationFrame(animate);
        TWEEN.update();
      }
    }

    setTimeout(() => {
      tween.start();
      requestAnimationFrame(animate);
    }, 500)

    let stepArr = this.frontRubik.randomRotate();
    this.endRubik.runMethodAtNo(stepArr, 0, () => {
      this.initEvent(); //进场动画结束之后才能进行手动操作
    });
  }

	/**
	* 重置正反视图魔方
	*/
	resetRubik() {
		this.frontRubik.reset();
		this.endRubik.reset();
	}

  /**
   * 扰乱正反视图魔方
   */
	disorganizeRubik(callback) {
		var self = this;
		if (!this.isRotating) {
			this.isRotating = true;
			var stepArr = this.frontRubik.randomRotate();
			this.endRubik.runMethodAtNo(stepArr, 0, function () {
				if (callback) {
					callback();
				}
				self.resetRotateParams();
			});
		}
	}
}