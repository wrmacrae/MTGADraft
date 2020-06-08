
Vue.component("patch-notes", {
	template: `
	<ol class="patch-notes">
		<li v-for="pn in notes">{{pn.date}}
			<ul>
				<li v-for="n in pn.notes" v-html="n"></li>
			</ul>
		</li>
	</ol>
	`,
	data: function () {
		return {
			notes: [],
		};
	},
	mounted: function () {
		fetch("data/PatchNotes.json")
			.then((response) => response.json())
			.then((json) => (this.notes = json));
	},
});