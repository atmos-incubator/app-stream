describe('Plugin: Hide Controls', () => {
  it('allows for playlist without showing controls', () => {
    const controls = { style: { } };
    require('./hide-controls.js')({}, {}, {}, controls);
    assert(controls.style.display === 'none');
  });
});
