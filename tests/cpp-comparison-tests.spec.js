/*
based on https://github.com/sidewalklabs/s2sphere/blob/master/tests/compare_implementations.py
needs some way of wrapping and using the c++ version of S2 (Python uses SWIG)
 */
require('../../expectAndFail.js');
require('../src/S2jsphere');

// const s2sphere = require('s2sphere'); // Make sure to import the appropriate JavaScript library

describe('TestCellId', () => {
  test('test_cellid', () => {
    const lat = 33;
    const lng = -122;
    const pyCellId = window.plugin.AzS2.CellId.fromLatLng(
      window.plugin.AzS2.LatLng.fromDegrees(lat, lng)
    );
    const cppCellId = s2.S2CellId.FromLatLng(
      s2.S2LatLng.FromDegrees(lat, lng)
    );
    expect(pyCellId.id()).toBe(cppCellId.id());
  });

  test('test_cellid_parents', () => {
    for (let level = 1; level <= 30; level++) {
      cellidParentComparison(level);
    }
  });

  test('test_cellid_from_truncated_token', () => {
    const pyCellId = window.plugin.AzS2.CellId.fromToken('89c259c4');
    const cppCellId = s2.S2CellId.FromToken('89c259c4');
    expect(pyCellId.id()).toBe(cppCellId.id());
  });

  test('test_cellid_to_token', () => {
    const pyCellId = window.plugin.AzS2.CellId.fromToken('89c259c4');
    const cppCellId = s2.S2CellId.FromToken('89c259c4');
    expect(pyCellId.toToken()).toBe(cppCellId.ToToken());
  });

  test('test_average_area', () => {
    const pyCell = new window.plugin.AzS2.Cell(window.plugin.AzS2.CellId.fromToken('89c259c4'));
    expect(pyCell.averageArea()).toBe(3.120891902436607e-08);
  });

  test('test_zeroprefix_token', () => {
    const pyCellId = window.plugin.AzS2.CellId.fromToken('03d23c0bdf');
    const cppCellId = s2.S2CellId.FromToken('03d23c0bdf');
    expect(pyCellId.toToken()).toBe(cppCellId.ToToken());
  });

  test('test_metric_level', () => {
    const radians = 10 / 6370;

    const pyLevelMin = window.plugin.AzS2.AVG_EDGE.getMinLevel(radians);
    const pyLevelClosest = window.plugin.AzS2.AVG_EDGE.getClosestLevel(radians);
    const pyLevelMax = window.plugin.AzS2.AVG_EDGE.getMaxLevel(radians);

    expect(pyLevelMin).toBe(10);
    expect(pyLevelClosest).toBe(10);
    expect(pyLevelMax).toBe(9);

    // Repeat the same logic for the 15km scale
    const radians15 = 15 / 6370;

    const pyLevelMin15 = window.plugin.AzS2.AVG_EDGE.getMinLevel(radians15);
    const pyLevelClosest15 = window.plugin.AzS2.AVG_EDGE.getClosestLevel(radians15);
    const pyLevelMax15 = window.plugin.AzS2.AVG_EDGE.getMaxLevel(radians15);

    expect(pyLevelMin15).toBe(10);
    expect(pyLevelClosest15).toBe(9);
    expect(pyLevelMax15).toBe(9);
  });

  test('test_cell_area_at_level', () => {
    const solidAngle10x10 = (10 * 10) / (6370 ** 2);
    const pyLevelMin10x10 = window.plugin.AzS2.AVG_AREA.getMinLevel(solidAngle10x10);
    const pyLevelClosest10x10 = window.plugin.AzS2.AVG_AREA.getClosestLevel(solidAngle10x10);
    const pyLevelMax10x10 = window.plugin.AzS2.AVG_AREA.getMaxLevel(solidAngle10x10);

    expect(pyLevelMin10x10).toBe(10);
    expect(pyLevelClosest10x10).toBe(10);
    expect(pyLevelMax10x10).toBe(9);

    // Repeat the same logic for the 15x15km scale
    const solidAngle15x15 = (15 * 15) / (6370 ** 2);
    const pyLevelMin15x15 = window.plugin.AzS2.AVG_AREA.getMinLevel(solidAngle15x15);
    const pyLevelClosest15x15 = window.plugin.AzS2.AVG_AREA.getClosestLevel(solidAngle15x15);
    const pyLevelMax15x15 = window.plugin.AzS2.AVG_AREA.getMaxLevel(solidAngle15x15);

    expect(pyLevelMin15x15).toBe(10);
    expect(pyLevelClosest15x15).toBe(9);
    expect(pyLevelMax15x15).toBe(9);
  });
});

function cellidParentComparison(level) {
  const lat = 33;
  const lng = -122;
  const pyCellId = window.plugin.AzS2.CellId.fromLatLng(
    window.plugin.AzS2.LatLng.fromDegrees(lat, lng)
  ).parent(level);
  const cppCellId = s2.S2CellId.FromLatLng(
    s2.S2LatLng.FromDegrees(lat, lng)
  ).parent(level);
  expect(pyCellId.id()).toBe(cppCellId.id());
}
