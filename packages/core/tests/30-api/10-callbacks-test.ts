/* eslint-disable @typescript-eslint/no-unused-vars-experimental */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/camelcase */
import 'mocha';
import { expect } from 'chai';
import {
	callbacks,
	updateCallbacks,
	storeCallback,
} from '../../lib/api/callbacks';
import { sortIcons } from '../../lib/icon/sort';
import { getStorage, addIconSet } from '../../lib/storage';

describe('Testing API callbacks', () => {
	let prefixCounter = 0;
	function nextPrefix(): string {
		prefixCounter++;
		return 'api-cb-test-' + (prefixCounter < 10 ? '0' : '') + prefixCounter;
	}

	it('Simple callback', done => {
		const prefix = nextPrefix();
		let counter = 0;

		const storage = getStorage(prefix);
		const abort = storeCallback(
			(loaded, missing, pending, unsubscribe) => {
				expect(unsubscribe).to.be.equal(abort);

				counter++;
				switch (counter) {
					case 1:
						// First run - icon1 should be loaded, icon3 should be missing
						expect(loaded).to.be.eql([
							{
								prefix,
								name: 'icon1',
							},
						]);
						expect(missing).to.be.eql([
							{
								prefix,
								name: 'icon3',
							},
						]);
						expect(pending).to.be.eql([
							{
								prefix,
								name: 'icon2',
							},
						]);
						expect(callbacks[prefix].length).to.be.equal(1);

						// Add icon2 and trigger update
						addIconSet(storage, {
							prefix: prefix,
							icons: {
								icon2: {
									body: '<g></g>',
								},
							},
						});

						updateCallbacks(prefix);
						return;

					case 2:
						// Second run - icon2 should be added, completing callback
						expect(loaded).to.be.eql([
							{
								prefix,
								name: 'icon1',
							},
							{
								prefix,
								name: 'icon2',
							},
						]);
						expect(missing).to.be.eql([
							{
								prefix,
								name: 'icon3',
							},
						]);
						expect(pending).to.be.eql([]);
						expect(callbacks[prefix].length).to.be.equal(0);
						done();
				}
			},
			sortIcons([
				{
					prefix,
					name: 'icon1',
				},
				{
					prefix,
					name: 'icon2',
				},
				{
					prefix,
					name: 'icon3',
				},
			]),
			[prefix]
		);

		// Test callbacks
		expect(callbacks[prefix].length).to.be.equal(1);

		// Test update - should do nothing
		updateCallbacks(prefix);

		// Wait for tick because updateCallbacks will use one
		setTimeout(() => {
			// Callback should not have been called yet
			expect(counter).to.be.equal(0);

			// Add few icons and run updateCallbacks
			addIconSet(storage, {
				prefix: prefix,
				icons: {
					icon1: {
						body: '<g></g>',
					},
				},
				not_found: ['icon3'],
			});
			updateCallbacks(prefix);
		});
	});

	it('Callback that should not be stored', () => {
		const prefix = nextPrefix();

		const storage = getStorage(prefix);
		addIconSet(storage, {
			prefix,
			icons: {
				icon1: {
					body: '<path d="" />',
				},
				icon2: {
					body: '<path d="" />',
				},
			},
			not_found: ['icon3'],
		});

		storeCallback(
			(loaded, missing, pending, unsubscribe) => {
				throw new Error('This code should not be executed!');
			},
			sortIcons([
				{
					prefix,
					name: 'icon1',
				},
				{
					prefix,
					name: 'icon2',
				},
				{
					prefix,
					name: 'icon3',
				},
			]),
			[prefix]
		);

		// callbacks should not have been initialised
		expect(callbacks[prefix]).to.be.equal(void 0);
	});

	it('Cancel callback', done => {
		const prefix = nextPrefix();
		let counter = 0;

		const storage = getStorage(prefix);
		const abort = storeCallback(
			(loaded, missing, pending, unsubscribe) => {
				expect(unsubscribe).to.be.equal(abort);

				counter++;
				expect(counter).to.be.equal(1);

				// First run - icon1 should be loaded, icon3 should be missing
				expect(loaded).to.be.eql([
					{
						prefix,
						name: 'icon1',
					},
				]);
				expect(missing).to.be.eql([
					{
						prefix,
						name: 'icon3',
					},
				]);
				expect(pending).to.be.eql([
					{
						prefix,
						name: 'icon2',
					},
				]);
				expect(callbacks[prefix].length).to.be.equal(1);

				// Add icon2 and trigger update
				addIconSet(storage, {
					prefix: prefix,
					icons: {
						icon2: {
							body: '<g></g>',
						},
					},
				});

				updateCallbacks(prefix);

				// Unsubscribe and set timer to call done()
				unsubscribe();
				expect(callbacks[prefix].length).to.be.equal(0);
				setTimeout(done);
			},
			sortIcons([
				{
					prefix,
					name: 'icon1',
				},
				{
					prefix,
					name: 'icon2',
				},
				{
					prefix,
					name: 'icon3',
				},
			]),
			[prefix]
		);

		// Test callbacks
		expect(callbacks[prefix].length).to.be.equal(1);

		// Test update - should do nothing
		updateCallbacks(prefix);

		// Wait for tick because updateCallbacks will use one
		setTimeout(() => {
			// Callback should not have been called yet
			expect(counter).to.be.equal(0);

			// Add few icons and run updateCallbacks
			addIconSet(storage, {
				prefix: prefix,
				icons: {
					icon1: {
						body: '<g></g>',
					},
				},
				not_found: ['icon3'],
			});
			updateCallbacks(prefix);
		});
	});

	it('Multiple prefixes', done => {
		const prefix1 = nextPrefix();
		const prefix2 = nextPrefix();
		let counter = 0;

		const storage1 = getStorage(prefix1);
		const storage2 = getStorage(prefix2);

		const abort = storeCallback(
			(loaded, missing, pending, unsubscribe) => {
				expect(unsubscribe).to.be.equal(abort);

				counter++;
				switch (counter) {
					case 1:
						// First run - icon1 should be loaded, icon3 should be missing
						expect(loaded).to.be.eql([
							{
								prefix: prefix1,
								name: 'icon1',
							},
						]);
						expect(missing).to.be.eql([
							{
								prefix: prefix1,
								name: 'icon3',
							},
						]);
						expect(pending).to.be.eql([
							{
								prefix: prefix2,
								name: 'icon2',
							},
						]);
						expect(callbacks[prefix1].length).to.be.equal(0);
						expect(callbacks[prefix2].length).to.be.equal(1);

						// Add icon2 and trigger update
						addIconSet(storage2, {
							prefix: prefix2,
							icons: {
								icon2: {
									body: '<g></g>',
								},
							},
						});

						updateCallbacks(prefix2);
						break;

					case 2:
						// Second run - icon2 should be loaded
						expect(callbacks[prefix1].length).to.be.equal(0);
						expect(callbacks[prefix2].length).to.be.equal(0);
						done();
						break;

					default:
						done('Callback was called ' + counter + ' times.');
				}
			},
			sortIcons([
				{
					prefix: prefix1,
					name: 'icon1',
				},
				{
					prefix: prefix2,
					name: 'icon2',
				},
				{
					prefix: prefix1,
					name: 'icon3',
				},
			]),
			[prefix1, prefix2]
		);

		// Test callbacks
		expect(callbacks[prefix1].length).to.be.equal(1);
		expect(callbacks[prefix2].length).to.be.equal(1);

		// Test update - should do nothing
		updateCallbacks(prefix1);

		// Wait for tick because updateCallbacks will use one
		setTimeout(() => {
			// Callback should not have been called yet
			expect(counter).to.be.equal(0);

			// Add few icons and run updateCallbacks
			addIconSet(storage1, {
				prefix: prefix1,
				icons: {
					icon1: {
						body: '<g></g>',
					},
				},
				not_found: ['icon3'],
			});
			updateCallbacks(prefix1);
		});
	});
});
