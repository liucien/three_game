import * as THREE from '../threejs/three.js';

export default class DisorganizeBtn {
  constructor(main) {
    this.main = main;
    this.isActive = false;
		//实际尺寸
    this.realWidth = 64;
    this.realHeight = 64;
		this.radio = this.main.originWidth/750;
		//逻辑尺寸
		this.width = this.realWidth * this.radio;
		this.height = this.width;

		//屏幕尺寸
		this.screenRect = {
			width: this.width / this.main.uiRadio,
			height: this.height / this.main.uiRadio
		}

		const loader = new THREE.TextureLoader();
		loader.load('images/disorganize_btn.png', texture => {
			let geometry = new THREE.PlaneBufferGeometry(this.width,this.height);
			let material = new THREE.MeshBasicMaterial({ map: texture, transparent:true});
			this.plane = new THREE.Mesh(geometry, material);
			this.plane.position.set(0,0,0);
			this.main.scene.add(this.plane);
			this.defaultPosition();
		})

  }

	/**
   * 默认位置
   */
	defaultPosition() {
		this.plane.position.x = -this.main.originWidth / 2 + this.width / 2 + 50 * this.radio;
		this.plane.position.y = this.main.originHeight / 2 - this.height * 3 / 2 - 35 * this.radio;

		this.screenRect.left = (this.main.originWidth / 2 + this.plane.position.x - this.width / 2) / this.main.uiRadio;
		this.screenRect.top = (this.main.originHeight / 2 - this.plane.position.y - this.height / 2) / this.main.uiRadio;
	}

  /**
   * 判断是否在范围内
   */
	isHover(touch) {
		var isHover = false;
		if (touch.clientY >= this.screenRect.top && touch.clientY <= this.screenRect.top + this.screenRect.height && touch.clientX >= this.screenRect.left && touch.clientX <= this.screenRect.left + this.screenRect.width) {
			isHover = true;
		}
		return isHover;
	}

	enable() {
		this.isActive = true;
	}
	disable() {
		this.isActive = false;
	}
}