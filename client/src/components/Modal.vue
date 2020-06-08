Vue.component("modal", {
	template: "#modal-template",
	methods: {
		close: function (e) {
			if (e.target == e.currentTarget) this.$emit("close");
		},
		shortcuts: function (e) {
			if (e.which === 27)
				// Escape
				this.$emit("close");
		},
	},
	mounted: function () {
		document.addEventListener("keydown", this.shortcuts);
	},
	beforeDestroy: function () {
		document.removeEventListener("keydown", this.shortcuts);
	},
});