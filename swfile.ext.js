(function ($) {
var defaults = {
    server : null,              // 服务器地址（附件服务器地址），如 http://ip:port
    project : null,             // 所属项目
    theme : "default",          // 主题样式名，对应swfile.skin.css中样式
    proxy : "File",             // 代理Servlet名称
    multiple : true,            // 是否可多选
    onInit : function(files) {},    // 初始化完毕回调
    onUpload : function(files) {},  // 上传完成回调
    onPreview : function(url, funDownload, funDelete) {},   // 预览回调
    onDownload : function(id) {},   // 下载开始回调
    onDelete : function(file) {},   // 删除完成回调
    onError : function(msg) {}      // 错误提示回调
};
var constants = {
    container_class : "sowell-file", // 样式名
    cache_key : "CACHE_KEY",
    max_limit : 20,         // 默认最大限制上传数
    no_edit : "readonly"    // 只读样式
};
$.fn.extend({
    swfile : function(options) { // 初始化
        if($(this).length < 1) return false;
        options = $.extend({}, defaults, options);
        var _self = this;
        $(_self)
            .addClass(constants.container_class)
            .addClass(options.theme)
            .addClass("loading load")
            .append($('<ul></ul>')
            .append($('<li class="add"></li>')
            .append('<b></b>')
            .append($('<div class="bar"></div>')
            .append('<div class="progress"></div>')
            .append('<div class="text"></div>'))));
        SWFile({
            server : options.server,
            ids : $(_self).map(function() {
                return $(this).attr("data-fids") || "";
            }).get().join(","),
            error : options.onError,
            ready : function(f) {
                options.onInit(f.files);
                $('<input type="hidden" name="' + constants.cache_key + '" />')
                    .val(f.cache).insertBefore($(_self).first());
                $(_self).removeClass("loading load");
                for(var i in f.files) {
                var file = f.files[i],
                    $container = $(_self).filter('[data-module="' + file.module + '"]');
                    createLi($container, [file], options, f);
                }
                $(_self).each(function() {
                    var _self = this;
                    f.upload({
                        target : $(_self).find('li.add>b'),
                        project : options.project,
                        module : $(_self).attr("data-module"),
                        multiple : options.multiple,
                        type : ($(_self).attr("data-type") || "all").split(","),
                        beforeUpload : function(input) {
                            $(_self).addClass("loading upload").find("li.add>.bar").show().find(">.progress").css("width", "0%");
                            return true;
                        },
                        onComplete : function(files) {
                            $(_self).removeClass("loading upload").find("li.add>.bar").hide().find(">.progress").css("width", "0%");
                            createLi($(_self), files, options, f);
                            options.onUpload(files);
                        },
                        onProgress : function(done, total) {
                            var percent = total == 0 ? 0 : parseInt(done / total * 100),
                                s = parseInt("cc", 16), // 当前背景色
                                e = parseInt("55", 16), // 目标背景色
                                d = s - parseInt(percent / 100 * (s - e)),
                                c = d.toString(16),
                                bgc = "#" + c + c + c;
                            $(_self).find("li.add>.bar")
                                .find(">.text").html(percent + "%").end()
                                .find(">.progress").stop().animate({
                                    "width" : percent + "%"
                                }, 100, function() {
                                    $(this).css({"background-color" : bgc});
                                });
                        }
                    });
                });
            }
        });
    }
});
var createLi = function($container, files, options, f) {
    for(var i in files) {
    var file = files[i],
        name = decodeURI(file.encodeName),
        prefix = options.server.substring(0, options.server.lastIndexOf('/')),
        $li = $('<li>' +
            '<b id="' + file.id + '" class="' + file.ftype + '">' +
                (file.ftype == "image" ?
                '<img src="' + prefix + "/" + file.webPath + '" />' :
                '') +
            '</b>' +
            '<span title="' + name + '">' + name + '</span>' +
            '<i>' +
                '<a class="download" href="javascript:;" title="下载"></a>' +
                (!$container.hasClass(constants.no_edit) ?
                '<a class="delete" href="javascript:;" title="删除"></a>' :
                '') +
            '</i>' +
        '</li>').find(">b:not(.other)").click(function() { // 预览
            var id = $(this).attr("id"),
                url = f.url_prefix + "/preview?id=" + id + "&key=" + f.cache + "&proxy=" + f.url_proxy;
            options.onPreview(url, function() { // 下载
                f.download(id);
                options.onDownload(id);
            }, !$container.hasClass(constants.no_edit) ? function() { // 删除
                f.remove(id, function(fileObj) {
                    deleteLi(fileObj);
                    options.onDelete(fileObj);
                });
            } : undefined);
        }).end().find(">i>a.download").click(function() { // 下载
            var id = $(this).parent().siblings("b").attr("id");
            f.download(id);
            options.onDownload(id);
        }).end().find(">i>a.delete").click(function() { // 删除
            var id = $(this).parent().siblings("b").attr("id");
            f.remove(id, function(fileObj) {
                deleteLi(fileObj);
                options.onDelete(fileObj);
            });
        }).end().find("img").error(function() {
            $(this).replaceWith('<div class="error"></div>');
        }).end().insertBefore($container.find('li.add'));
        limitHide($container);
    }
};
var deleteLi = function(fileObj) {
    var $li = $("b#" + fileObj.id).parent();
    var $container = $li.parent().parent();
    $li.remove();
    limitHide($container);
};
// 此区域超过最大限制文件数，则隐藏添加按钮
var limitHide = function($container) {
    var limit = $container.attr("data-limit");
    limit = typeof(limit) == "undefined" ? constants.max_limit : parseInt(limit);
    if($container.find("li:not(li.add)").length >= limit) {
        $container.find("li.add").hide();
    } else {
        $container.find("li.add").show();
    }
};
//动态引入css
$("script").last().each(function() {
    var root = function(){var a=location.href;var b=location.pathname;var c=a.substring(0,a.indexOf(b));var d=b.substring(0,b.substr(1).indexOf('/')+1);return c+d+"/";}();
    var path = $(this).attr("src");
    path = path.substr(0, path.lastIndexOf('/') + 1);
    $("<link>").attr({
        rel : "stylesheet",
        type : "text/css",
        href : root + path + "swfile.skin.css"
    }).insertAfter($(this));
    $("<link>").attr({
        rel : "stylesheet",
        type : "text/css",
        href : root + path + "swfile.css"
    }).insertAfter($(this));
});
})(jQuery);