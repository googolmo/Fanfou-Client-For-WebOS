function UploadAssistant(arg) {
    /* this is the creator function for your scene assistant object. It will be passed all the 
       additional parameters (after the scene name) that were passed to pushScene. The reference
       to the scene controller (this.controller) has not be established yet, so any initialization
       that needs the scene controller should be done in the setup function below. */
       this.launchParams = arg;
       Mojo.Log.error("arg: "+JSON.stringify(arg));
      
}
var img_to_send_path = "";
var consumer_token = "60648e4719285ec6fb437785e655bda5";
var consumer_secret = "aed509928807eab4f1a615e4d422c724";
var access_token = "";              
var access_secret = "";


// 选择图片
UploadAssistant.prototype.eBTNSelect = function(){
    var self = this; //Retain the reference for the callback
    var params = { defaultKind: 'image',
      onSelect: function(file){
          //self.controller.get('selection').innerHTML = Object.toJSON(file);
          img_to_send_path = file.fullPath;
      }
    }
    Mojo.FilePicker.pickFile(params, self.controller.stageController);
};

// 在这个函数中弹出提示，告诉用户当前没有任何信息需要提交
UploadAssistant.prototype.nullInputUpdate = function(){
    Mojo.Log.error("NULL input.");
    upload_processing = 0;
    this.controller.get('id_send_status').mojo.deactivate();
    this.controller.showAlertDialog({
        //onChoose: function(value) {this.controller.get("area-to-update").innerText = "Alert result = " + value;},
        title: $L("出错！"),
        message: $L("请先添加照片或状态！"),
        choices:[
             // {label:$L('Rare'), value:"refresh", type:'affirmative'},  
             // {label:$L("Medium"), value:"don't refresh"},
             // {label:$L("Overcooked"), value:"don't refresh", type:'negative'},    
             {label:$L("返回"), value:"maybe refresh", type:'dismiss'}    
        ]
        });
    return false;
}

// 发送(图片)状态更新到饭否
UploadAssistant.prototype.eBTNSend = function(){
    upload_processing = 1;
    if(img_to_send_path == "" && this.controller.get('textField').mojo.getValue() == "")
    {
        return this.nullInputUpdate();
    }
    if(img_to_send_path == "")
    {
        // TODO 告诉用户先选择照片
        return this.updateStatusToFanfou(this.controller.get('textField').mojo.getValue());
    }
    // 调用uploadPicToFanfou上传照片
    return this.uploadPicToFanfou(img_to_send_path, this.controller.get('textField').mojo.getValue());
}

UploadAssistant.prototype.updateStatusToFanfou = function(status){
    if(status == "")
    {
        Mojo.Log.error("Can't update status without input.");
        upload_processing = 0;
        this.controller.get('id_send_status').mojo.deactivate();
        return false;
    }
    try {
    var libraries = MojoLoader.require({ name: "foundations" , version: "1.0"     });
    //var Future = libraries["foundations"].Control.Future; // Futures library
    var DB = libraries["foundations"].Data.DB;  // db8 wrapper library
    } catch (Error) {
                        Mojo.Log.error(Error);
                        upload_processing = 0;
                        this.controller.get('id_send_status').mojo.deactivate();
                        return false;
                    }
    if(DB)
    {
        var fquery = {"from":"com.riderwoo.helloworld:1"};
        // 获取access_token,access_screte
        DB.find(fquery, false, false).then(function(future) {
          var result = future.result;
          if (result.returnValue === true)   
         {
             if(result.results[0].fanfou_access_token != undefined && result.results[0].fanfou_access_secret != undefined )
             {
                 access_token = result.results[0].fanfou_access_token;
                 access_secret = result.results[0].fanfou_access_secret;
                 var accessor = { consumerSecret: consumer_secret
                           , tokenSecret   : access_secret};
                 var message = { method: "POST"
                           , action: "http://api.fanfou.com/statuses/update.json"
                           , parameters: []
                           };
                 message.parameters.push(["status", status]);
                 message.parameters.push(["oauth_consumer_key", consumer_token]);
                 message.parameters.push(["oauth_nonce", OAuth.nonce(11)]);
                 message.parameters.push(["oauth_timestamp", OAuth.timestamp()]);
                 message.parameters.push(["oauth_token", access_token]);
                 OAuth.SignatureMethod.sign(message, accessor);
                 //showText("normalizedParameters", OAuth.SignatureMethod.normalizeParameters(message.parameters));
                 //showText("signatureBaseString" , OAuth.SignatureMethod.getBaseString(message));
                 //showText("signature"           , OAuth.getParameter(message.parameters, "oauth_signature"));
                 //showText("authorizationHeader" , OAuth.getAuthorizationHeader("", message.parameters));
             
                 var headers = {"Authorization":OAuth.getAuthorizationHeader("", message.parameters)};
             
                 var url = message.action;
                 Mojo.Log.info('url: ' + url);
                
                 $.ajax({
                           type: "POST",
                           url: url,
                           headers: headers,
                           data: "status="+status,
                           success: this.cbGetAccessParamsSuccess.bind(this),
                           error: this.cbGetAccessParamsError.bind(this)
                         });
                 return true;
             }
             else
             {
                 // TODO 重新获取access_token,access_secret
                 Mojo.Log.error("Bug! Failed to get access_token and access_secret.");
                 upload_processing = 0;
                 this.controller.get('id_send_status').mojo.deactivate();
                 return false;
             }
          }
          else
          {  
             result = future.exception;
             Mojo.Log.error("find failure: Err code=" + result.errorCode + "Err message=" + result.message);
             upload_processing = 0;
             this.controller.get('id_send_status').mojo.deactivate(); 
             return false;
          }
        }.bind(this));
    }
    else
    {
        Mojo.Log.error("Failed to get DB8 instance.");
        upload_processing = 0;
        this.controller.get('id_send_status').mojo.deactivate();
        return false;
    }
    return true;
}

UploadAssistant.prototype.cbGetAccessParamsSuccess = function(msg) {
    upload_processing = 0;
    this.controller.get('id_send_status').mojo.deactivate();
    Mojo.Log.info( "Update status successfully.\nReturn is: "+JSON.stringify(msg) );
    this.controller.showAlertDialog({
        //onChoose: function(value) {this.controller.get("area-to-update").innerText = "Alert result = " + value;},
        title: $L("发送成功！"),
        //message: $L("发送成功！"),
        choices:[
             // {label:$L('Rare'), value:"refresh", type:'affirmative'},  
             // {label:$L("Medium"), value:"don't refresh"},
             // {label:$L("Overcooked"), value:"don't refresh", type:'negative'},    
             {label:$L("返回"), value:"maybe refresh", type:'dismiss'}    
        ]
        });
}


/*
 * Called by Prototype when the request fails.
 */
UploadAssistant.prototype.cbGetAccessParamsError = function(msg) {
    upload_processing = 0;
    this.controller.get('id_send_status').mojo.deactivate();
    Mojo.Log.error( "Failed to update status.\nReturn is: "+JSON.stringify(msg) );
    this.controller.showAlertDialog({
        //onChoose: function(value) {this.controller.get("area-to-update").innerText = "Alert result = " + value;},
        title: $L("发送失败！"),
        //message: $L("发送成功！"),
        choices:[
             // {label:$L('Rare'), value:"refresh", type:'affirmative'},  
             // {label:$L("Medium"), value:"don't refresh"},
             // {label:$L("Overcooked"), value:"don't refresh", type:'negative'},    
             {label:$L("返回"), value:"maybe refresh", type:'dismiss'}    
        ]
        });
    //this.controller.get('selection').innerHTML = "Failed to update status.\nReturn is: "+JSON.stringify(msg);
}
UploadAssistant.prototype.uploadPicToFanfou = function(file_path, status)
{
    if(file_path == "")
    {
        Mojo.Log.error("Can't upload without file path.");
        upload_processing = 0;
        this.controller.get('id_send_status').mojo.deactivate();
        return false;
    }
    try {
    var libraries = MojoLoader.require({ name: "foundations" , version: "1.0"     });
    //var Future = libraries["foundations"].Control.Future; // Futures library
    var DB = libraries["foundations"].Data.DB;  // db8 wrapper library
    } catch (Error) {
                        Mojo.Log.error(Error);
                        upload_processing = 0;
                        this.controller.get('id_send_status').mojo.deactivate();
                        return false;
                    }
    if(DB)
    {
        var fquery = {"from":"com.riderwoo.helloworld:1"};
        // 获取access_token,access_screte
        DB.find(fquery, false, false).then(function(future) {
          var result = future.result;
          if (result.returnValue === true)   
         {
             if(result.results[0].fanfou_access_token != undefined && result.results[0].fanfou_access_secret != undefined )
             {
                 access_token = result.results[0].fanfou_access_token;
                 Mojo.Log.error("access_token: "+access_token);
                 access_secret = result.results[0].fanfou_access_secret;
                 Mojo.Log.error("access_secret: "+access_secret);
                 var accessor = { consumerSecret: consumer_secret
                        , tokenSecret   : access_secret};
                var message = { method: "POST"
                          , action: "http://api.fanfou.com/photos/upload.json"
                          , parameters: []
                          };
            
                message.parameters.push(["oauth_consumer_key", consumer_token]);
                message.parameters.push(["oauth_nonce", OAuth.nonce(11)]);
                message.parameters.push(["oauth_timestamp", OAuth.timestamp()]);
                Mojo.Log.error("before push into parameters access_token: "+access_token);
                message.parameters.push(["oauth_token", access_token]);
                OAuth.SignatureMethod.sign(message, accessor);
                Mojo.Log.error("Our base string is: "+OAuth.SignatureMethod.getBaseString(message));
                //showText("normalizedParameters", OAuth.SignatureMethod.normalizeParameters(message.parameters));
                //showText("signatureBaseString" , OAuth.SignatureMethod.getBaseString(message));
                //showText("signature"           , OAuth.getParameter(message.parameters, "oauth_signature"));
                //showText("authorizationHeader" , OAuth.getAuthorizationHeader("", message.parameters));
            
                var headers = {"Authorization":OAuth.getAuthorizationHeader("", message.parameters)};
                Mojo.Log.error('Authorization: ' + headers.Authorization);
            
                var url = message.action;
                Mojo.Log.info('url: ' + url);
                
                // 调用WebOS的DownloadManager上传文件
                var download_manager_obj = new Mojo.Service.Request('palm://com.palm.downloadmanager/', {
                    method: "upload",
                    parameters: {
                        "fileName": file_path,
                        "fileLabel":"photo",
                        "url": url,
                        //"contentType": "image/jpg",
                        "postParameters": [
                            {"key" : "status", "data" : status, "contentType" : "text/plain"},
                            ],
                         "subscribe": true ,
                         "customHttpHeaders": ["Authorization: "+headers.Authorization],
                      },
                      onSuccess : function (e){
                          Mojo.Log.error("Upload processing, results="+JSON.stringify(e)); 
                          //this.controller.get('selection').innerHTML = "Upload success, results="+JSON.stringify(e);
                          if(e.httpCode == 200)
                          {
                              upload_processing = 0;
                              this.controller.get('id_send_status').mojo.deactivate(); 
                              //Mojo.Log.info( "Upload pic successfully.\nReturn is: "+JSON.stringify(e) );
                              this.controller.showAlertDialog({
                                  //onChoose: function(value) {this.controller.get("area-to-update").innerText = "Alert result = " + value;},
                                  title: $L("发送成功！"),
                                  //message: $L("发送成功！"),
                                  choices:[
                                       // {label:$L('Rare'), value:"refresh", type:'affirmative'},  
                                       // {label:$L("Medium"), value:"don't refresh"},
                                       // {label:$L("Overcooked"), value:"don't refresh", type:'negative'},    
                                       {label:$L("返回"), value:"maybe refresh", type:'dismiss'}    
                                       ]                                   
                                  });                         
                          }
                          }.bind(this),
                      onFailure : function (e){ 
                          Mojo.Log.error("Upload failure, results="+JSON.stringify(e));
                          //this.controller.get('selection').innerHTML = "Upload failure, results="+JSON.stringify(e);
                          upload_processing = 0;
                          this.controller.get('id_send_status').mojo.deactivate();
                          //Mojo.Log.error( "Failed to update status.\nReturn is: "+JSON.stringify(msg) );
                          this.controller.showAlertDialog({
                              //onChoose: function(value) {this.controller.get("area-to-update").innerText = "Alert result = " + value;},
                              title: $L("发送失败！"),
                              //message: $L("发送成功！"),
                              choices:[
                                   // {label:$L('Rare'), value:"refresh", type:'affirmative'},  
                                   // {label:$L("Medium"), value:"don't refresh"},
                                   // {label:$L("Overcooked"), value:"don't refresh", type:'negative'},    
                                   {label:$L("返回"), value:"maybe refresh", type:'dismiss'}    
                              ]
                          });
                      }.bind(this)
                });
             }
             else
             {
                 // TODO 重新获取access_token,access_secret
                 Mojo.Log.error("Bug! Failed to get access_token and access_secret.");
                 upload_processing = 0;
                 this.controller.get('id_send_status').mojo.deactivate();
                 return false;
             }
         }
          else
          {  
             result = future.exception;
             Mojo.Log.error("find failure: Err code=" + result.errorCode + "Err message=" + result.message); 
             upload_processing = 0;
             this.controller.get('id_send_status').mojo.deactivate();
             return false;
          }
        }.bind(this));
    }
    else
    {
        Mojo.Log.error("Failed to get DB8 instance.");
        upload_processing = 0;
        this.controller.get('id_send_status').mojo.deactivate();
        return false;
    }
    
    return true;
}
var upload_processing = 0;
UploadAssistant.prototype.setup = function() {
    // Set up a few models so we can test setting the widget model:
    //Mojo.Log.error("Enter upload scene");
    upload_processing = 0;
    this.controller.setupWidget("id_select_img",
         {
            type : Mojo.Widget.defaultButton
          },
         {
            label : "选择一张图片...",
            disabled: false
         }
     );
     Mojo.Event.listen(this.controller.get('id_select_img'),Mojo.Event.tap, this.eBTNSelect.bind(this));
     
     this.controller.setupWidget("id_send_status",
         {
            type : Mojo.Widget.activityButton
          },
         {
            label : "发送",
            disabled: false
         }
     );
     Mojo.Event.listen(this.controller.get('id_send_status'),Mojo.Event.tap, this.eBTNSend.bind(this));
     
     /* 初始化用户名输入框 */
     var attributes = {
                hintText: '',
                textFieldName:  'name', 
                modelProperty:      'original', 
                multiline:      true,
                disabledProperty: 'disabled',
                autoFocus:          true, 
                modifierState:  Mojo.Widget.capsLock,
                //autoResize:   automatically grow or shrink the textbox horizontally,
                //autoResizeMax:    how large horizontally it can get
                //enterSubmits: when used in conjunction with multline, if this is set, then enter will submit rather than newline
                limitResize:    false, 
                holdToEnable:  false, 
                focusMode:      Mojo.Widget.focusInsertMode,
                changeOnKeyPress: true,
                textReplacement: false,
                requiresEnterKey: false
    };
    if(this.launchParams.status != undefined)
    {
        this.model = {
            'original' : this.launchParams.status,
            disabled: false
        };
    }
    else
    {
        this.model = {
            'original' : "",
            disabled: false
        };
    }

    this.controller.setupWidget('textField', attributes, this.model);
    
    this.controller.get("id_title").innerText = "你在做什么？";
    

}

UploadAssistant.prototype.activate = function(event) {
    /* put in event handlers here that should only be in effect when this scene is active. For
       example, key handlers that are observing the document */
};

UploadAssistant.prototype.deactivate = function(event) {
    /* remove any event handlers you added in activate and do any other cleanup that should happen before
       this scene is popped or another scene is pushed on top */
};

UploadAssistant.prototype.cleanup = function(event) {
    /* this function should do any cleanup needed before the scene is destroyed as 
       a result of being popped off the scene stack */
      Mojo.Event.stopListening(this.controller.get('id_select_img'),Mojo.Event.tap, this.eBTNSelect.bind(this));
      Mojo.Event.stopListening(this.controller.get('id_select_img'),Mojo.Event.tap, this.eBTNSend.bind(this));
};