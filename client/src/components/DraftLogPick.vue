Vue.component("draft-log-pick", {
	template: `
<div class="card-container">
	<div is="card" v-for="(card, index) in pick.booster" v-bind:key="index" v-bind:card="$root.cards[card]" v-bind:language="$root.language" :class="{'selected-high': pick.pick === card, burned: pick.burn && pick.burn.includes(card)}">
	</div>
</div>
	`,
	props: { pick: { type: Object, required: true } },
});