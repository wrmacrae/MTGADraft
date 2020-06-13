<template>
	<footer>
		<span @click="$root.modal = 'about'">
			<a>About</a>
		</span>
		<span>
			<input type="file" id="log-input" @change="$root.openLog" style="display:none" accept=".txt" />
			<a
				onclick="document.querySelector('#log-input').click()"
				v-tooltip="'Open a saved draft log.'"
			>Open Draft Log</a>
		</span>
		<span>
			Made by
			<a href="http://senryoku.github.io/">Senryoku</a>
		</span>
		<span>
			<a href="mailto:mtgadraft@gmail.com">Contact</a>
		</span>
		<span>
			Get
			<a href="https://magic.wizards.com/fr/mtgarena">Magic: The Gathering Arena</a>
		</span>
	</footer>
</template>