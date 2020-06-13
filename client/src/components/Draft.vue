<template>
	<div>
		<WinstonDraft
			v-if="$root.draftingState === DraftState.WinstonPicking || $root.draftingState === DraftState.WinstonWaiting"
		></WinstonDraft>
		<div v-show="$root.draftingState == DraftState.Watching" class="draft-watching">
			<div class="draft-watching-state">
				<h1>Players are drafting...</h1>
				<div v-show="pickTimer >= 0">
					<i class="fas fa-clock"></i>
					{{ pickTimer }}
				</div>
				<div>Booster #{{ $root.boosterNumber }}, Pick #{{ $root.pickNumber }}</div>
			</div>
			<div
				v-if="$root.draftLog && $root.draftLog.sessionID === sessionID"
				class="draft-watching-live-log"
			>
				<draft-log-live :draftlog="$root.draftLog"></draft-log-live>
			</div>
		</div>
		<div v-show="$root.draftingState == DraftState.Waiting" class="pick-waiting">
			<span class="spinner"></span>
			<span v-show="pickTimer >= 0">
				(
				<i class="fas fa-clock"></i>
				{{ pickTimer }})
			</span>
			Waiting for other players to pick...
		</div>
		<div v-if="$root.draftingState == DraftState.Picking" id="booster-container" class="container">
			<div id="booster-controls" class="controls">
				<h2>Your Booster</h2>
				<span>Booster #{{ $root.boosterNumber }}, Pick {{ $root.pickNumber }}</span>
				<span v-show="$root.pickTimer >= 0" :class="{ redbg: $root.pickTimer <= 10 }" id="chrono">
					<i class="fas fa-clock"></i>
					{{ $root.pickTimer }}
				</span>
				<input
					type="button"
					@click="pickCard"
					value="Confirm Pick"
					v-if="
							selectedCard != undefined &&
								(burningCards.length === burnedCardsPerRound ||
									booster.length === 1 + burningCards.length)
						"
				/>
				<span v-else>
					Pick a card
					<span v-if="cardsToBurnThisRound > 0">
						and remove {{ cardsToBurnThisRound }} cards from the pool ({{ burningCards.length }}/{{
						cardsToBurnThisRound
						}})
					</span>
				</span>
			</div>
			<div class="booster card-container">
				<div
					is="card"
					v-for="(card, index) in booster"
					v-bind:key="`${index}-${card.id}`"
					v-bind:card="card"
					v-bind:language="language"
					v-bind:selectcard="selectCard"
					v-bind:ondblclick="doubleClickCard"
					v-bind:selected="selectedCard === card"
					:canbeburned="burnedCardsPerRound > 0"
					:burned="burningCards.includes(card)"
					:burn="burnCard"
					:restore="restoreCard"
				></div>
			</div>
		</div>
	</div>
</template>

<script>
import WinstonDraft from "./WinstonDraft.vue";
export default {
	component: {
		WinstonDraft,
	},
	data: function() {
		return {
			booster: [],
			boosterNumber: 0,
			pickNumber: 0,
			pickTimer: 75,
		};
	},
	methods: {
		mounted: function() {},
	},
};
</script>
