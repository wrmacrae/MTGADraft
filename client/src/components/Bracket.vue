<template>
	<modal v-if="displayBracket" @close="displayBracket = false">
		<h2 slot="header">
			Bracket
			<button v-if="userID === sessionOwner" @click="generateBracket">Re-Generate Bracket</button>
		</h2>
		<div slot="body">
			<div class="bracket" v-if="bracket">
				<div class="bracket-column" v-for="col in matches">
					<div v-for="m in col" class="bracket-match">
						<div v-for="(p, index) in m.players">
							<div class="bracket-player bracket-empty" v-if="p.empty">(Empty)</div>
							<div class="bracket-player bracket-tbd" v-else-if="p.tbd">(TBD)</div>
							<div
								class="bracket-player"
								:class="{
									'bracket-winner':
										bracket.results[m.index][index] > bracket.results[m.index][(index + 1) % 2],
								}"
								v-else
							>
								<div class="bracket-player-name">{{ p }}</div>
								<template v-if="m.isValid()">
									<input
										v-if="userID === sessionOwner"
										class="small-number-input"
										type="number"
										v-model.number="bracket.results[m.index][index]"
										min="0"
										@change="updateBracket"
									/>
									<div class="bracket-result" v-else>{{ bracket.results[m.index][index] }}</div>
								</template>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</modal>
</template>

<style>
.bracket {
	display: flex;
}

.bracket-column {
	display: flex;
	flex-direction: column;
	justify-content: space-around;
}

.bracket-match {
	padding: 0.5em;
	margin: 1em;

	background: #333;
	border-radius: 1em;
}

.bracket-player {
	display: flex;
	justify-content: space-between;
	height: 2em;
	line-height: 2em;
	width: 20rem;
	padding: 0.5em;
	margin: 0.5em;
}

.bracket-winner {
	background-color: #555;
	box-shadow: 0 0 5px 5px #555;
}

.bracket-tbd,
.bracket-empty {
	color: grey;
}

.bracket-result {
	font-size: 2em;
}

.bracket-player-name {
	font-size: 1.5em;
	max-width: 15rem;
	overflow: hidden;
}
</style>
