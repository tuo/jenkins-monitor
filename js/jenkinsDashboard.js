/*jslint browser:true, sloppy: true, plusplus: true */
/*globals $: false, config: false */

var dashboardLastUpdatedTime = new Date(),
    sounds = [],
    soundQueue = {
        add: function (sound_url) {
            sounds.push(sound_url);
        },
        play: function () {
            var sound = sounds.shift();
            if(sound) {
                var soundPlayer = $("#sound")[0];
                if (soundPlayer.paused) {
                    soundPlayer.src = sound;
                    soundPlayer.play();
                }
            }
        }
    };

var JenkinsDashboard = function (config, name, $parent) {
    this.config = config;
    this.name = name || config.url;
    this.$parent = $parent || $('body')
    this.lastData = null;

    this.$element = $('<section id="' + encodeURI(this.name) + '"></section>');
    this.$parent.append(this.$element);
}
JenkinsDashboard.prototype.addTimestampToBuild = function (elements) {
    var parent = this.$element;
    elements.each(function(){
        var worker = $(this).attr("class"),
            y = parseInt($(this).offset().top + $(this).height() / 2),
            x = parseInt($(this).offset().left + $(this).width() / 2),
            id = x + "-" + y,
            html = '<div class="job-disabled-or-aborted" id="' + id + '">' + worker + '</div>',
            new_element;
        parent.append(html);
        new_element = $("#" + id);
        new_element.css("top", parseInt(y - new_element.height() / 2)).css("left", parseInt(x - new_element.width() / 2));
        new_element.addClass('rotate');
        parent.addClass('workon');
    });
};

JenkinsDashboard.prototype.composeHtmlFragement = function (jobs) {
    var filtered = this.config.jobs_to_be_filtered;
    var excluded = this.config.jobs_to_be_excluded;
    this.$element.html(
        $.map(jobs, function (job) {
            if ((filtered.length === 0 || $.inArray(job.name, filtered) !== -1) && ($.inArray(job.name, excluded) === -1)) {
                return "<article class=" + job.color + "><head>" + job.name + "</head></article>";
            }
        }).join('')
    );
};

JenkinsDashboard.prototype.refresh = function () {
    $.ajax({
        url: this.config.ci_url + "/api/json",
        dataType: 'json',
        success: ( data ) => {
            console.log(data);
            $.unblockUI();
            this.lastData = data;
            this.composeHtmlFragement(data.jobs);
            this.addTimestampToBuild($(".disabled, .aborted"));
            soundForCI(data)
        },
        error: function (e) {
            console.log(e);
            if ($("#error_loading").length <= 0) {
                $.blockUI({message: '<h1 id="error_loading"> Ooooops, check out your network etc. Retrying........</h1>'});
            }
        }
    });
};

function soundForCI(data) {
    if (this.lastData == null) return data;
    $(data.jobs).each(function (index) {
        if (this.lastData.jobs[index] === undefined) return;
        if (this.lastData.jobs[index].color === 'blue_anime' && this.color === 'red') {
            soundQueue.add('http://translate.google.com/translate_tts?q=build+' + this.name + '+faild&tl=en');
        }
        if (this.lastData.jobs[index].color === 'blue' && this.color === 'blue') {
            soundQueue.add('sounds/build_fail_super_mario.mp3');
        }
    });
    return data;
}
$(document).ready(function () {
    //$.blockUI({message: '<h1 id="loading"><img src="img/busy.gif" />loading.....</h1>'});
    var $time = $('#time');
    $time.text((new Date()).toUTCString());
    var dashboards = $.map(config, (c) => {
        return new JenkinsDashboard(c);
    });
    auto_refresh = setInterval(function () {
        $time.text((new Date()).toUTCString());
        $.each(dashboards, function (i, dashboard) {
            dashboard.refresh();
        });
        soundQueue.play();
    }, 4000)
});