(function(root, factory){
    if (typeof define === 'function' && define.amd){
        define(['backbone-deep-model', 'array-events'], 
        factory);
    }else if(typeof exports === 'object'){
        module.exports = factory(require('backbone-deep-model'), require('array-events'));
    }else{
        root.LiveTemplates = factory(
            root.Backbone, root.EventedArray
        );
    }
}(this, function(Backbone, EventedArray){ //Emitter, domTool, request + optional: Handlebars, Backbone
    function passthruEvent(subscribeType, model, event, field, handler){
        if(typeof field == 'function'){
            handler = field;
            field = undefined;
        }
        if(field) model[subscribeType](event+':'+field, handler);
        else model[subscribeType](event, handler);
    }
    var backboneModel = function(model){ //backbone implementation
        if(!model) throw new Error('You must pass in a model to this handler!');
        if(model['_LIVE_WRAP']) return model['_LIVE_WRAP'];
        if(model.isWrapped) return model; //no double wraps
        var wrap = {
            get : function(field){
                return model.get(field);
            },
            set : function(field, value){
                return model.set(field, value);
            },
            id : Math.floor(Math.random() * 1000000).toString(16),
            on : function(event, field, handler){
                if(typeof field == 'function' && !handler){
                    handler = field;
                    field = undefined;
                }
                switch(event){
                    case 'change' :
                        var subhandler = function(changeEvent){
                            handler(getData(changeEvent.changed, field));
                        };
                        handler.subhandler = subhandler;
                        passthruEvent('on', model, event, field, handler.subhandler);
                        break;
                    case 'add' :
                        var subhandler = function(item){
                            handler(item);
                        };
                        if(handler) handler.subhandler = subhandler;
                        passthruEvent('on', model, event, field, subhandler);
                        break;
                    default : passthruEvent('on', model, event, field, handler);
                }
            },
            off : function(event, field, handler){
                if(typeof field == 'function' && !handler){
                    handler = field;
                    field = undefined;
                }
                passthruEvent('off', model, event, field, handler.subhandler || handler);
            },
            emit : function(event, value){
                passthruEvent('emit', model, event, undefined, value);
            },
            isList : function(){
                return EventedArray.is(model);
            },
            raw : model.models || model,
            isWrapped : true,
            once : function(event, field, handler){
                if(typeof field == 'function' && !handler){
                    handler = field;
                    field = undefined;
                }
                switch(event){
                    case 'change' :
                        var subhandler = function(changeEvent){
                            handler(getData(changeEvent.changed, field));
                        };
                        handler.subhandler = subhandler;
                        passthruEvent('once', model, event, field, handler.subhandler);
                        break;
                    default : passthruEvent('once', model, event, field, handler);
                }
            }
        };
        Object.defineProperty(wrap, '_LIVE_WRAP', {
            get : function(){
                return wrap;
            },
            set : function(value){ } //fail silently
        });
        Object.defineProperty(wrap, 'length', {
            get : function(){
                return model.length;
            },
            set : function(value){ } //fail silently
        });
        return wrap;
    };
    
    //todo: optimize recusive pattern to inline
    var getData = function(store, field){
        if(!Array.isArray(field)){
            return getData(store, field.split('.'))
        }else{
            if(field.length == 0){
                return store;
            }else{
                var subfield = field.shift();
                return getData(store[subfield], field)
            }
        }
    };
    backboneModel.isList = function(model){
        return EventedArray.is(model);
    };
    
    backboneModel.is = function(model){
        return EventedArray.is(model) || model instanceof Backbone.DeepModel;
    };
    
    backboneModel.automap = function(model){
        if(Array.isArray(model)) return new EventedArray(
            model.map(function(item){ 
                return new Backbone.DeepModel(item);
            })
        );
        else return new Backbone.DeepModel(model);
    };
    
    return backboneModel;
}));