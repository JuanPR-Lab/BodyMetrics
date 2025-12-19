<script lang="ts">
	import { Sparkles } from 'lucide-svelte';
	import { t } from 'svelte-i18n';

	export let onClose: () => void;
	export let onGoToHelp: () => void;
</script>

<div class="modal-overlay">
	<div class="modal-content">
		<div class="modal-header">
			<Sparkles size={48} class="welcome-icon" />
			<h2>{$t('welcome_modal.title')}</h2>
		</div>
		<div class="modal-body">
			<p>
				{$t('welcome_modal.text')}
			</p>
		</div>
		<div class="modal-footer">
			<button
				on:click={() => {
					onClose();
					onGoToHelp();
				}}
				class="primary-button"
			>
				{$t('welcome_modal.button')}
			</button>
		</div>
	</div>
</div>

<style>
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(0, 0, 0, 0.5);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 1000;
	}

	.modal-content {
		background-color: white;
		padding: 2rem;
		border-radius: 12px;
		max-width: 500px;
		width: 90%;
		box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
		font-family: inherit;
	}

	.modal-header {
		display: flex;
		flex-direction: column;
		align-items: center;
		margin-bottom: 1.5rem;
	}

	.modal-body {
		margin-bottom: 2rem;
		text-align: center;
		line-height: 1.6;
		color: #334155;
		font-size: 1rem;
	}

	.modal-footer {
		display: flex;
		justify-content: center;
	}

	.primary-button {
		background-color: #4f46e5;
		color: white;
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: 8px;
		cursor: pointer;
		font-size: 1rem;
		font-weight: 600;
		transition: all 0.3s;
		box-shadow: 0 2px 4px rgba(79, 70, 229, 0.2);
	}

	.primary-button:hover {
		background-color: #4338ca;
		transform: translateY(-1px);
		box-shadow: 0 4px 8px rgba(79, 70, 229, 0.3);
	}

	h2 {
		font-size: 1.5rem;
		font-weight: 700;
		color: #1e293b;
		margin: 0;
	}

	p {
		margin: 0;
		font-family: inherit;
	}
</style>
