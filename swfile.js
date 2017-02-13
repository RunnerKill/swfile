/**
 * @title 文件服务器交互工具
 * @description 兼容IE8
 * @version 3.0.0
 * @author Xiaojie.Xu
 */
(function(window, undefined) {
var
    defaults = {
        server : null,              // 服务器地址（附件服务器地址），如 http://ip:port
        proxy : "File",             // 代理Servlet名称
//        proxy : "proxy.jsp",        // 代理Servlet名称
        error : function(msg) {     // 错误提示回调，msg - 错误信息
            alert(msg);
        }
    },
    request_name = "/swfile",    // 服务器端Controller名
    css = {
        "display" : "block",
        "overflow" : "hidden",
        "border" : "none",
        "margin" : "0",
        "padding" : "0",
        "position" : "absolute",
        "top" : "0",
        "left" : "0",
        "width" : "100%",
        "height" : "100%",
        "opacity" : "0",
        "cursor" : "pointer"
    },
    SWFile = function(options) {
        return new SWFile.prototype.init(options);
    },
    root = function(){
        var href = location.href;
        var pathname = location.pathname;
        var domain = href.substring(0, href.indexOf(pathname));
        var project = pathname.substring(0, pathname.substr(1).indexOf('/') + 1);
        return domain + project + "/";
    }(),
    array_index = 0,
    ie8_setValue = function(idoc, obj) { // ie8 无法直接给iframe的window对象赋值
        SWFile.array[array_index] = obj;
        idoc.write('<script>' +
                'swfile=parent.SWFile.array[' + array_index + '];' +
                'parent.SWFile.array[' + array_index ++ + ']=undefined;' +
        '</script>');
    },
    ie8_getBody = function(idoc) { // ie8 iframe无法自动创建body
        if(!idoc.body) idoc.write("<br/>");
        return $(idoc.body); 
    };
SWFile.array = new Array();
SWFile.prototype = {
    root : root,
    constructor : SWFile, // fix the constructor
    uploader : 0,
    init : function(options) {
        options = $.extend({}, defaults, options);
        if(!options.server) {
            options.error("服务器参数未设置");
            return this;
        }
        this.url_prefix = options.server + request_name,
        this.url_proxy = this.root + options.proxy;
        this.error = options.error;
        var iframe = this.iframe = $('<iframe></iframe>').hide().appendTo('body')[0];
        this.idocument = iframe.contentDocument;
//        this.iwindow = iframe.contentWindow;
//        this.iwindow.swfile = this;
        ie8_setValue(this.idocument, this);
        this.request("/init", {
            fids : options.ids.toString()
        });
        this.onInit = function(obj) {
            this.ftype = obj.ftype;
            this.cache = obj.key;
            this.files = obj.files;
            options.ready(this);
        };
        return this;
    },
    request : function(action, data) {
        var time = new Date().getTime(),
            name = "swframe" + time,
            $iframe = $('<iframe></iframe>').attr("name", name).hide(),
            $form = $('<form></form>').attr({
                "method" : "post",
                "target" : name,
                "action" : this.url_prefix + action
            }),
            data = $.extend(data, {
                key : this.cache,
                proxy : this.url_proxy
            });
        $.each(data, function(k, v) {
            $form.append('<input type="hidden" name="' + k + '" value="' + v + '"/>');
        });
        ie8_getBody(this.idocument).append($iframe).append($form);
        $form.submit().remove();
    },
    get : function(id, cb) {
        this.onGet = cb;
        this.request("/get", {
            id : id
        });
    },
    remove : function(id, cb) {
        this.onDelete = cb;
        this.request("/delete", {
            id : id
        });
    },
    download : function(id) {
        this.request("/download", {
            id : id
        });
    },
    upload : function(options) {
        options = $.extend({}, {
            target : null,
            project : null,
            module : null,
            multiple : true,
            once : false,
            type : ["all"],
            beforeUpload : function(input) {return true;},
            onProgress : function(done, total) {},
            onComplete : function(file) {}
        }, options);
        var $target = options.target;
        if(!$target || $target.length < 1 || !options.project || !options.module) {
            this.error("文件参数不完整");
            return this;
        }
        $target = $target.eq(0); // 只能初始化一个
        var _self = this,
            index = _self.uploader ++,
            position = $target.css("position"),
            iframe = $('<iframe></iframe>').hide().css(css).appendTo($target)[0],
            idocument = iframe.contentDocument,
            $upload_frame = $('<iframe></iframe>').attr("name", "swframeupload").hide(),
            $upload_input = $('<input type="file" name="file"' + (options.multiple ? ' multiple="multiple"' : '') + ' />').css(css),
            $upload_form = $('<form target="swframeupload" enctype="multipart/form-data" method="post"></form>').css(css)
            .attr("action", this.url_prefix + "/upload?" + this.cache + "-" + index)
            .append('<input name="key" type="hidden" value="' + this.cache + '" />')
            .append('<input name="index" type="hidden" value="' + index + '" />')
            .append('<input name="proxy" type="hidden" value="' + this.url_proxy + '" />')
            .append('<input name="project" type="hidden" value="' + options.project + '" />')
            .append('<input name="module" type="hidden" value="' + options.module + '" />')
            .append($upload_input);
        if(position != 'absolute') {
            $target.css('position', 'relative');
        }
//        iframe.contentWindow.swfile = this;
        ie8_setValue(idocument, this);
        ie8_getBody(idocument).append($upload_frame).append($upload_form);
        $upload_input.change(function() {
            if(!_self.isCorrectType(this, options.type)) {
                _self.error("文件格式不正确");
                return ;
            }
            if(!options.beforeUpload(this)) return false;
            $(this).hide().closest("form").submit().remove();
            if(options.onProgress) _self.progress(index, options.onProgress);
            _self.onUpload = function(files) {
                $(iframe).remove(); // destroy iframe
                if(!options.once) _self.upload(options); // reInit upload
                options.onComplete(files);
            }
        });
    },
    progress : function(index, cb) {
        var _self = this;
        this.request("/progress", {
            index : index
        });
        this.onProgress = function(progress) {
            if(progress.bytesRead < progress.contentLength) {
                _self.progress(index, cb);
            }
            cb(progress.bytesRead, progress.contentLength);
        };
    },
    isCorrectType : function(input, type) { // 判断文件类型是否合法
        if(input.files) {
            if(input.files.length < 1) return false;
        } else {
            if(input.value == '') return false;
        }
        if(type[0] == "all") return true;
        var typelist = [];
        for(var i in type) {
            typelist = typelist.concat(this.ftype[type[i].replace(/(^\s*)|(\s*$)/g, "")]);
        }
        var contain = function(array, e) {
            for(var i = 0; i < array.length; i ++) {
                if(array[i] == e) return true;
            }
            return false;
        };
        var suffix = function(name) {
            return name.substring(name.lastIndexOf(".") + 1).toLowerCase();
        };
        if(input.files) {
            for(var i = 0; i < input.files.length; i ++) {
                if(!contain(typelist, suffix(input.files[i].name))) return false;
            }
        } else { // ie8
            if(!contain(typelist, suffix(input.value))) return false;
        }
        return true;
    },
//    synchronize : function() {
//        this.request("/synchronize");
//    },
    callback : function(act, data, iiwin) {
        var method = "on" + act.substring(0, 1).toUpperCase() + act.substring(1);
        $(iiwin.frameElement).remove();
        this[method](data);
    }
};
//Give the init function the SWFile prototype for later instantiation
SWFile.prototype.init.prototype = SWFile.prototype;
//If there is a window object, that at least has a document property,
//define SWFile identifier
if ( typeof window === "object" && typeof window.document === "object" ) {
    window.SWFile = SWFile;
}
})(window);