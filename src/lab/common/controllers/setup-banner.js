/*global define, $ */

define(function () {

  var labConfig          = require('lab.config'),
      TextController     = require('common/controllers/text-controller'),
      ImageController    = require('common/controllers/image-controller'),
      DivController      = require('common/controllers/div-controller'),
      PlaybackController = require('common/controllers/playback-controller'),
      tooltip            = require('common/views/tooltip'),

      topBarHeight    = 1.5,
      topBarFontScale = topBarHeight*0.65,
      topBarVerticalPadding = topBarHeight/10;

  /**
   * Returns a hash containing:
   *  - components,
   *  - containers,
   *  - layout definition (components location).
   * All these things are used to build the interactive banner.
   *
   * @param {InteractivesController} controller
   * @param {Object} interactive Interactive JSON definition.
   * @param {CreditsDialog} creditsDialog
   * @param {AboutDialog} aboutDialog
   * @param {ShareDialog} shareDialog
   */
  return function setupBanner(controller, interactive, creditsDialog, aboutDialog, shareDialog) {
    var components = {},
        template = [],
        layout = {},
        // About link visible if there is about section or subtitle.
        haveAboutText = interactive.about || interactive.subtitle,
        body, requestFullscreenMethod;

    template.push({
      "id": "top-bar",
      "top": "0",
      "left": "0",
      "height": topBarHeight + "em",
      "padding-top": topBarVerticalPadding + "em",
      "padding-bottom": topBarVerticalPadding + "em",
      "width": "container.width",
      "aboveOthers": true
    });

    template.push({
      "id": "bottom-bar",
      "bottom": "container.height",
      "left": "0",
      "width": "container.width",
      "height": "2.5em",
      "belowOthers": true
    });

    function createElementInContainer(element, container) {
      var Controller;

      if (element.type === "text") {
        Controller = TextController;
      } else if (element.type === "image") {
        Controller = ImageController;
      } else if (element.type === "div") {
        Controller = DivController;
      } else if (element.type === "playback") {
        Controller = PlaybackController;
      }

      components[element.id] = new Controller(element, controller.scriptingAPI, controller);
      template.push(container);
      layout[container.id] = [element.id];
    }

    // Define about link only if "about" or "subtitle" section is available.
    aboutDialog.update(interactive);
    createElementInContainer({
      "type": "text",
      "id": "about-link",
      "text": "About",
      "onClick": function () {
        if (haveAboutText) {
          aboutDialog.open();
        } else {
          creditsDialog.open();
        }
      },
      "tooltip": "Need instructions? Click the *About* link."
    },
    {
      "id": "banner-right",
      "fontScale": topBarFontScale,
      "top": "0",
      "height": topBarHeight + "em",
      "padding-top": topBarVerticalPadding + "em",
      "padding-bottom": topBarVerticalPadding + "em",
      "right": "interactive.width",
      "padding-left": "1em",
      "padding-right": "0.75em",
      "align": "right",
      "aboveOthers": true
    });

    // Define sharing link only if sharing is enabled.
    // Note that due to layout limitations, banner-middle container
    // has to be defined *after* banner-right container which is used
    // in its specification!
    if (labConfig.sharing) {
      shareDialog.update(interactive);
      createElementInContainer(
      {
        "type": "text",
        "id": "share-link",
        "text": "Share",
        "onClick": function () { shareDialog.open(); },
        "tooltip": "Share this interactive using e-mail, IM or embed in website or blog. " +
                   "Click the *Share* link."
      },
      {
        "id": "banner-middle",
        "fontScale": topBarFontScale,
        "top": "0",
        "height": topBarHeight + "em",
        "padding-top": topBarVerticalPadding + "em",
        "padding-bottom": topBarVerticalPadding + "em",
        // "banner-right" can be undefined, so check it.
        "right": "banner-right.left",
        "padding-right": "1em",
        "align": "right",
        "aboveOthers": true
      });
    }

    createElementInContainer({
      "type": "div",
      // This is pretty important, as using a right ID, we can avoid disabling our own tooltip.
      "id": "lab-tooltips-switch",
      "content": '<i class="icon-question-sign"/>',
      "classes": ["delay", tooltip.TOOLTIP_ALWAYS_VISIBLE_CLASS],
      "onClick": function () {
        var $target = $(this);
        if (tooltip.disabled) {
          tooltip.disabled = false;
          tooltip.delay = true;
        } else if (tooltip.delay) {
          tooltip.delay = false;
        } else {
          tooltip.disabled = true;
        }
        if (tooltip.disabled) {
          $target.addClass("disabled");
          $target.removeClass("delay");
          $target.attr("data-lab-tooltip", "<p>Tooltips are disabled. Click to enable them.</p>");
        } else if (tooltip.delay) {
          $target.addClass("delay");
          $target.removeClass("disabled");
          $target.attr("data-lab-tooltip", "<p>Tooltips are enabled, but will be shown with a delay. " +
                                           "Click to show them immediately on hover.</p>");
        } else {
          $target.removeClass("delay");
          $target.removeClass("disabled");
          $target.attr("data-lab-tooltip", "<p>Tooltips are enabled and will be shown immediately. " +
                                           "Click to disable them.</p>");
        }
        $target.tooltip("close");
      },
      "tooltip": "Tooltips are enabled, but will be shown with a delay. " +
                 "Click to show them immediately on hover."
    }, {
      "id": "banner-left",
      "fontScale": topBarFontScale,
      "top": "0",
      "height": topBarHeight + "em",
      "padding-top": topBarVerticalPadding + "em",
      "padding-bottom": topBarVerticalPadding + "em",
      // "banner-right" can be undefined, so check it.
      "left": "0.6em",
      "padding-right": "1em",
      "align": "left",
      "aboveOthers": true
    });

    // bottom bar
    creditsDialog.update(interactive);
    createElementInContainer(
    {
      "type": "div",
      "id": "credits-link",
      "height": "2.5em",
      "width": "8.1em",
      "classes": ["credits"],
      "tooltip": "Learn more about *Next-Generation Molecular Workbench* " +
                 "and *The Concord Consortium*.",
      "onClick": function () { creditsDialog.open(); }
    },
    {
      "id": "banner-bottom-left",
      "bottom": "container.height",
      "left": "0",
      "padding-left": "0.3em",
      "align": "left",
      "belowOthers": true
    });

    // see if we can go fullscreen. If we can, add a fullscreen button.
    // Note: This requires iframe to be embedded with 'allowfullscreen=true' (and
    // browser-specific variants). If iframe is not embedded with this property, button
    // will show but will not work. It is not clear whether we can find out at this moment
    // whether iframe was embedded appropriately.
    body = document.body;

    requestFullscreenMethod =
         body.requestFullScreen ||
         body.webkitRequestFullScreen ||
         body.mozRequestFullScreen ||
         body.msRequestFullScreen;

    document.cancelFullscreenMethod =
         document.cancelFullScreen ||
         document.webkitCancelFullScreen ||
         document.mozCancelFullScreen ||
         document.msCancelFullScreen;

    function isFullscreen() {
      // this doesn't yet exist in Safari
      if (document.fullscreenElement||
          document.webkitFullscreenElement ||
          document.mozFullScreenElement) {
        return true;
      }
      // annoying hack to check Safari
      return ~$(".fullscreen").css("background-image").indexOf("exit");
    }

    if (requestFullscreenMethod) {
      createElementInContainer(
      {
        "type": "div",
        "id": "fullsize-link",
        "height": "2.5em",
        "width": "2.5em",
        "classes": ["fullscreen"],
        "tooltip": "Open interactive in full-screen mode",
        "onClick": function () {
          if (!isFullscreen()) {
            requestFullscreenMethod.call(body);
            $("#fullsize-link").attr("data-lab-tooltip", "<p>Exit full-screen mode</p>");
          } else {
            document.cancelFullscreenMethod();
            $("#fullsize-link").attr("data-lab-tooltip", "<p>Open interactive in full-screen mode</p>");
          }
        }
      },
      {
        "id": "banner-bottom-right",
        "bottom": "container.height",
        "right": "container.width",
        "align": "left",
        "padding-left": "1em",
        "belowOthers": true
      });
    }

      createElementInContainer(
      {
        "type": "playback",
        "id": "playback"
      },
      {
        "id": "interactive-playback-container",
        "bottom": "container.height",
        "left": "container.width/2 - interactive-playback-container.width/2",
        "height": "banner-bottom-left.height",
        "belowOthers": true
      });

    return {
      components: components,
      template: template,
      layout: layout
    };
  };
});
