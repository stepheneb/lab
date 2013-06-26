/*global define */

/**
  This plugin adds chemical reaction dynamics functionality to the MD2D engine.

  Datatable changes`
    atoms:
      radical: an int representing the current level of excitation of an atom, from
        floor (0) to an arbitrary level. In this model each atom is assumed to have one
        single electron that can be excited to any of a finite number of levels. The
        actual energy of each level is defined by the atom's element

  New serialized properties:

    elementEnergyLevels: A 2-dimensional array defining energy levels for each element

*/


define(function(require) {

  // static variables
  var CloneRestoreWrapper = require('common/models/engines/clone-restore-wrapper'),
      constants           = require('../constants/index'),
      utils               = require('../utils'),

      // in reality, 6.626E-34 m^2kg/s. Classic MW uses 0.2 in its units (eV * fs)
      PLANCK_CONSTANT = constants.convert(0.2, { from: constants.unit.EV, to: constants.unit.MW_ENERGY_UNIT }),

      // Speed of light.
      // in reality, about 300 nm/fs! Classic uses 0.2 in its units (0.1Å/fs), which is 0.002 nm/fs:
      C = 0.002,
      TWO_PI = 2 * Math.PI,

      // expected value of lifetime of excited energy state, in fs
      LIFETIME = 1000,
      EMISSION_PROBABILITY_PER_FS = 1/LIFETIME;

  return function ChemicalReaction(engine, _properties) {

    var arrays               = require('arrays'),
        arrayTypes           = require('common/array-types'),
        metadata             = require('md2d/models/metadata'),
        validator            = require('common/validator'),

        properties           = validator.validateCompleteness(metadata.chemicalReactions, _properties),

        api,

        dimensions           = engine.getDimensions(),

        // atoms,

        updateAtomsTable = function() {
          var length = atoms.x.length;

          // atoms.radical = arrays.create(length, 0, arrayTypes.uint8Type);
        };

    // Public API.
    api = {
      initialize: function(dataTables) {
        // atoms     = dataTables.atoms;
        // updateAtomsTable();
      }
    };

    return api;
  };

});
