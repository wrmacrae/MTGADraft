<template>
	<modal v-if="displayAbout" @close="displayAbout = false">
		<h2 slot="header">About</h2>
		<div slot="body">
			<h3>Contact</h3>
			<p>Senryoku: <a href="mailto:mtgadraft@gmail.com">mtgadraft@gmail.com</a> (French or English)</p>
			<p>MTGADraft Discord: <a href="https://discord.gg/KYKzx9m">https://discord.gg/KYKzx9m</a></p>
			<h3>Support me</h3>
			<form action="https://www.paypal.com/cgi-bin/webscr" method="post" target="_top">
				<input type="hidden" name="cmd" value="_s-xclick" />
				<input type="hidden" name="hosted_button_id" value="6L2CUS6DH82DL" />
				<input
					type="image"
					src="https://www.paypalobjects.com/en_US/i/btn/btn_donate_LG.gif"
					border="0"
					name="submit"
					title="PayPal - The safer, easier way to pay online!"
					alt="Donate with PayPal button"
				/>
			</form>
			This service currently only costs me time, but if you want to encourage me to maintain and improve it you
			can donate via PayPal - Thank you very much if you do! - , or just send me some feedback! :)
			<h3>Patch Notes</h3>
			<patch-notes></patch-notes>
		</div>
	</modal>
</template>
