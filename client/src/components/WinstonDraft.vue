<template>
	<div id="booster-container" class="container">
		<div class="winston-status">
			<h2>Winston Draft</h2>
			<span>
				<template v-if="userID === winstonDraftState.currentPlayer">
					Your turn to pick a pile of cards!
				</template>
				<template v-else>Waiting on {{ userByID[winstonDraftState.currentPlayer].userName }}...</template>
				There are {{ winstonDraftState.remainingCards }} cards left in the main stack.
			</span>
		</div>
		<div class="winston-piles">
			<div
				v-for="(pile, index) in winstonDraftState.piles"
				:key="index"
				class="winston-pile"
				:class="{ 'winston-current-pile': index === winstonDraftState.currentPile }"
			>
				<template v-if="userID === winstonDraftState.currentPlayer && index === winstonDraftState.currentPile">
					<div class="card-column winstom-card-column">
						<figure
							is="card"
							v-for="card in pile"
							:key="card.uniqueID"
							v-bind:card="card"
							v-bind:language="language"
						></figure>
					</div>
					<div class="winston-current-pile-options">
						<button class="confirm" @click="winstonDraftTakePile">Take Pile</button>
						<button class="cancel" @click="winstonDraftSkipPile" v-if="winstonCanSkipPile">
							Skip Pile
							<span v-show="index === 2">and Draw</span>
						</button>
					</div>
				</template>
				<template v-else>
					<div class="card-column winstom-card-column">
						<div v-for="card in pile" :key="card.uniqueID" class="card">
							<div class="card-placeholder"></div>
						</div>
					</div>
					<div class="winston-pile-status" v-show="index === winstonDraftState.currentPile">
						{{ userByID[winstonDraftState.currentPlayer].userName }} is looking at this pile...
					</div>
				</template>
			</div>
		</div>
	</div>
</template>

<style scoped>
.winston-status {
	margin-bottom: 0.5em;
}

.winston-status h2 {
	display: inline-block;
	margin: 0 1em 0 1em;
}

.winston-piles {
	display: flex;
	justify-content: space-around;
	position: relative;
	padding: 0.75em;
	min-height: 354.2px;
}

.winston-pile {
	margin: 0 1em 0 1em;
	padding: 0.5em;
}

.winston-pile .card img {
	width: 250px;
}

.winston-current-pile {
	background-color: #555;
	-webkit-box-shadow: 0px 0px 5px 5px #555;
	-moz-box-shadow: 0px 0px 5px 5px #555;
	box-shadow: 0px 0px 5px 5px #555;
}

.winston-current-pile-options {
	display: flex;
	flex-direction: column;
}

.winstom-card-column {
	display: flex;
	flex-direction: column;
	padding-bottom: 354.2px;
}

.winston-pile-status {
	box-sizing: border-box;
	width: 200px;
	padding: 0.5em;
	text-align: center;
}
</style>
