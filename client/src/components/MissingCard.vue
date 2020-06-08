Vue.component("missingCard", {
	template: `
	<div class="card">
		<clazy-load :ratio="0.01" margin="200px" :src="card.image_uris[language]" loadingClass="card-loading">
			<img v-if="card.image_uris[language]" :src="card.image_uris[language]" :title="card.printed_name[language]" />
			<img v-else src="img/missing.svg">
			<div class="card-placeholder" slot="placeholder">
				<div class="card-name">{{card.printed_name[language]}}</div>
			</div>
		</clazy-load>
		<div class="not-booster" v-if="!card.in_booster">Can't be obtained in boosters.</div>
		<div class="card-count" v-if="card.count < 4">x{{4 - card.count}}</div>
	</div>
	`,
	props: {
		card: { type: Object, required: true },
		language: { type: String, default: "en" },
	},
	created: function () {
		// Preload Carback
		const img = new Image();
		img.src = "img/cardback.png";
	},
});