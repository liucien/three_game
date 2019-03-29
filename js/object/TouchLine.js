import * as THREE from '../threejs/three.js';

export default class TouchLine {
  constructor(main) {
    this.main = main;

    //实际尺寸:因为这里的 UI 元素完全由图片构成，因此这里的实际尺寸其实就是指图片的实际尺寸
    this.realWidth = 750;
    this.realHeight = 64;

    //逻辑尺寸：因为需要把 UI 元素绘制到 3D 场景中，因此绘制时需要知道 UI 元素在 3D 场景坐标系中的位置以及尺寸，也就是逻辑尺寸；
    this.width = this.main.originWidth;
    this.height = this.realHeight * this.width / this.realWidth;

    //屏幕尺寸：把 UI 元素绘制到 3D 场景之后会被渲染到屏幕上，此时展现在屏幕中的尺寸就是屏幕尺寸。
    this.screenRect = {
      width: window.innerWidth,
      height: this.realHeight * window.innerWidth / this.realWidth
    }
    this.screenRect.left = 0;
    this.screenRect.top = window.innerHeight / 2 - this.screenRect.height / 2;

    //图片加载器
    const loader = new THREE.TextureLoader();
    loader.load('images/touch-line.png',
      texture => {
        let geometry = new THREE.PlaneGeometry(this.width, this.height);
        let material = new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true
        });
        this.plane = new THREE.Mesh(geometry, material);
        this.plane.position.set(0, 0, 0);
        this.main.scene.add(this.plane);
				this.defaultPosition();
      },
      progress => {
        console.log((xhr.loaded / xhr.total * 100) + '% loaded');
      },
      err => {
        console.log('An error happened');
      }
    )

  }
	defaultPosition() {
		this.enable();
		this.move(window.innerHeight * (1 - this.main.minPercent));
		this.disable();
	}
  enable() {
    this.isActive = true;
  }
  disable() {
    this.isActive = false;
  }

  move(y) {
    if (this.isActive) {
      if (y < window.innerHeight * this.main.minPercent || y > window.innerHeight * (1 - this.main.minPercent)) {
        if (y < window.innerHeight * this.main.minPercent) {
          y = window.innerHeight * this.main.minPercent;
        } else {
          y = window.innerHeight * (1 - this.main.minPercent);
        }
      }

      //屏幕移动距离
      let len = this.screenRect.top + this.screenRect.height / 2 - y;
      let percent = len / window.innerHeight;
      let len2 = this.main.originHeight * percent;
      this.plane.position.y += len2;
      this.screenRect.top = y - this.screenRect.height / 2;
    }
  }
  /**
   * 判断是否在范围内
   */
  isHover(touch) {
    let isHover = false;
    if (touch.clientY >= this.screenRect.top && touch.clientY <= this.screenRect.top + this.screenRect.height && touch.clientX >= this.screenRect.left && touch.clientX <= this.screenRect.left + this.screenRect.width) {
      isHover = true;
    }
    return isHover;
  }
}