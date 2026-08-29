/** Buddy User — formulario completo del perfil universal. */
window.BuddyUserViews = window.BuddyUserViews || {};
(function (window, document) {
  'use strict';
  function ensureStyles() {
    if (document.getElementById('buddy-user-view-styles')) return;
    var style=document.createElement('style');style.id='buddy-user-view-styles';
    style.textContent='.buddy-user-view{font:inherit;display:grid;gap:16px;max-width:760px}.buddy-user-view section{border:1px solid #ddd;border-radius:12px;padding:16px}.buddy-user-view form{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}.buddy-user-view label{display:grid;gap:6px}.buddy-user-view input,.buddy-user-view select,.buddy-user-view textarea,.buddy-user-view button{font:inherit;padding:9px;border:1px solid #ccc;border-radius:8px}.buddy-user-view textarea{min-height:90px;resize:vertical}.buddy-user-view .wide{grid-column:1/-1}.buddy-user-view .actions{grid-column:1/-1;display:flex;gap:8px;align-items:center}.buddy-user-view .status{grid-column:1/-1;min-height:1.3em}.buddy-user-photo{display:flex;gap:12px;align-items:center}.buddy-user-view .hint{opacity:.75;font-size:.92em}';
    document.head.appendChild(style);
  }
  function archerySchoolApi(){
    var buddy=window.Buddy;
    if(buddy&&buddy.modules&&typeof buddy.modules.isActive==='function'&&!buddy.modules.isActive('archerySchool'))return null;
    return (buddy&&buddy.archerySchool)||null;
  }
  function currentAttribute(list,type){
    var found=null;
    (list||[]).forEach(function(a){if(a&&a.tipo===type&&!a.vigenteHasta)found=a;});
    return found;
  }
  function attrValue(list,type,key){
    var a=currentAttribute(list,type);return a&&a[key]!=null?a[key]:'';
  }

  window.BuddyUserViews.profile=function(context){
    ensureStyles();
    var target=context.target,user=context.user||{},api=context.api,config=context.config||{};target.innerHTML='';
    var root=document.createElement('div');root.className='buddy-user-view';
    var title=document.createElement('h2');title.textContent='Mi perfil';root.appendChild(title);
    var intro=document.createElement('p');intro.className='hint';intro.textContent='Estos datos pertenecen a tu cuenta universal de Buddy y pueden ser utilizados por los sitios donde tengas una relación activa.';root.appendChild(intro);

    var identity=document.createElement('section');var ih=document.createElement('h3');ih.textContent='Identidad y contacto';identity.appendChild(ih);
    var form=document.createElement('form');
    function add(labelText,name,value,type,required,readonly){
      var l=document.createElement('label');l.textContent=labelText;var i=document.createElement('input');i.name=name;i.type=type||'text';i.value=value==null?'':value;if(required)i.required=true;if(readonly)i.readOnly=true;l.appendChild(i);form.appendChild(l);return i;
    }
    add('Nombre','firstName',user.firstName||'','text',false,false);
    add('Apellido','lastName',user.lastName||'','text',false,false);
    add('Nombre para mostrar','name',user.name||'','text',true,false);
    add('Correo electrónico','email',user.email||'','email',true,true);
    add('Número celular que usa en WhatsApp','phone',user.phone||'','tel',true,false);
    if(!config.fields||config.fields.locale!==false){
      var l=document.createElement('label');l.textContent='Idioma';var s=document.createElement('select');s.name='locale';
      (config.locales||[]).forEach(function(o){var x=document.createElement('option');x.value=o.value;x.textContent=o.label;x.selected=o.value===user.locale;s.appendChild(x);});l.appendChild(s);form.appendChild(l);
    }
    var actions=document.createElement('div');actions.className='actions';var status=document.createElement('div');status.className='status';var save=document.createElement('button');save.type='submit';save.textContent='Guardar cambios';actions.appendChild(save);form.appendChild(status);form.appendChild(actions);
    form.addEventListener('submit',function(e){e.preventDefault();save.disabled=true;status.textContent='Guardando…';var data={};Array.prototype.forEach.call(form.elements,function(el){if(el.name)data[el.name]=el.value;});api.updateProfile(data).then(function(){status.textContent='Cambios guardados.';}).catch(function(err){status.textContent=err.message;}).finally(function(){save.disabled=false;});});
    identity.appendChild(form);root.appendChild(identity);

    var photoSection=document.createElement('section');var ph=document.createElement('h3');ph.textContent='Foto de perfil';photoSection.appendChild(ph);
    var photo=document.createElement('div');photo.className='buddy-user-photo';photo.appendChild(api.avatar(user,'buddy-user-avatar'));
    var file=document.createElement('input');file.type='file';file.accept='image/*';file.addEventListener('change',function(){if(!file.files[0])return;api.uploadPhoto(file.files[0]).then(function(){return api.getCurrent();}).then(function(){return api.render({target:target,view:'profile'});}).catch(function(err){photoStatus.textContent=err.message;});});
    photo.appendChild(file);var photoStatus=document.createElement('span');photoStatus.className='hint';photo.appendChild(photoStatus);photoSection.appendChild(photo);root.appendChild(photoSection);

    target.appendChild(root);

    var as=archerySchoolApi();
    if(!as)return root;

    var asc=as.config||{};
    var attributes=[];

    function ownName(){
      return user.name||[user.firstName,user.lastName].filter(Boolean).join(' ')||user.email||'Usuario';
    }
    function personaIdOf(profile){return profile&&(profile._id||profile.id)||null;}
    function addField(form2,labelText,name,value,type){
      var l=document.createElement('label');l.textContent=labelText;
      var i=document.createElement('input');i.name=name;i.type=type||'text';i.value=value==null?'':value;l.appendChild(i);form2.appendChild(l);return i;
    }
    function addSelect(form2,labelText,name,options,value){
      var l=document.createElement('label');l.textContent=labelText;var s=document.createElement('select');s.name=name;
      var e=document.createElement('option');e.value='';e.textContent='Selecciona';s.appendChild(e);
      (options||[]).forEach(function(o){var x=document.createElement('option');x.value=o.value||o;x.textContent=o.label||o;x.selected=(x.value===String(value==null?'':value));s.appendChild(x);});
      l.appendChild(s);form2.appendChild(l);return s;
    }
    function statusActions(form2,text){
      var st=document.createElement('div');st.className='status';
      var ac=document.createElement('div');ac.className='actions';
      var b=document.createElement('button');b.type='submit';b.textContent=text;ac.appendChild(b);
      form2.appendChild(st);form2.appendChild(ac);return {status:st,button:b};
    }
    function resolveOwnPersona(){
      var stateProfile=as.getState&&as.getState().profile;
      if(stateProfile)return Promise.resolve(stateProfile);
      return as.getProfile().then(function(p){return p;}).catch(function(err){
        if(err&&err.status===404)return as.createProfile({nombreCompleto:ownName()});
        throw err;
      });
    }
    function ownPersonaIdAfter(profile){
      var id=personaIdOf(profile)||(as.getState&&as.getState().profile&&personaIdOf(as.getState().profile));
      if(!id)return Promise.reject(new Error('No se pudo determinar el perfil de arquería.'));
      return Promise.resolve(id);
    }
    function loadAttributes(){
      return as.getAttributes().then(function(list){
        var items=Array.isArray(list)?list:(list&&(list.attributes||list.data))||[];
        attributes=items.slice();
        fillAttrs();
      });
    }
    function obtainAttrs(statusEl){
      return loadAttributes().catch(function(err){
        if(err&&err.status===404){
          attributes=[];fillAttrs();
          if(statusEl)statusEl.textContent='Aún no tienes datos de arquería registrados. Completa el formulario y se crearán al guardar.';
          return;
        }
        throw err;
      });
    }
    function saveFields(statusEl,button,specs){
      button.disabled=true;statusEl.textContent='Guardando…';
      resolveOwnPersona().then(ownPersonaIdAfter).then(function(personaId){
        var jobs=[];
        specs.forEach(function(spec){spec.build(jobs,personaId);});
        return Promise.all(jobs);
      }).then(loadAttributes).then(function(){
        statusEl.textContent='Guardado.';
      }).catch(function(err){
        statusEl.textContent=err.message;
      }).finally(function(){button.disabled=false;});
    }

    /* MEDIDAS Y CARACTERÍSTICAS */
    var attrsSection=document.createElement('section');var ah=document.createElement('h3');ah.textContent='Medidas y características';attrsSection.appendChild(ah);
    var attrsHint=document.createElement('p');attrsHint.className='hint';attrsHint.textContent='Consulta y actualiza tus medidas y características de arquería.';attrsSection.appendChild(attrsHint);
    var af=document.createElement('form');
    var attrFields={};
    attrFields.altura=addField(af,'Altura (cm)','altura',attrValue(attributes,'altura','valorCm'),'number');
    attrFields.peso=addField(af,'Peso (kg)','peso',attrValue(attributes,'peso','valorKg'),'number');
    attrFields.lateralidad=addSelect(af,'Lateralidad','lateralidad',asc.lateralidad||[],attrValue(attributes,'lateralidad','valor'));
    attrFields.genero=addField(af,'Género','genero',attrValue(attributes,'genero','valor'),'text');
    attrFields.aperturaBrazos=addField(af,'Apertura de brazos (cm)','aperturaBrazos',attrValue(attributes,'aperturaBrazos','valorCm'),'number');
    attrFields.aperturaArco=addField(af,'Apertura de arco (cm)','aperturaArco',attrValue(attributes,'aperturaArco','valorCm'),'number');
    attrFields.librajeActual=addField(af,'Libraje actual (lbs)','librajeActual',attrValue(attributes,'librajeActual','valorLbs'),'number');
    attrFields.variacionBase=addField(af,'Variación base','variacionBase',attrValue(attributes,'variacionBase','valor'),'text');
    attrFields.posibilidadAdquisicion=addSelect(af,'Posibilidad de adquisición','posibilidadAdquisicion',asc.posibilidadAdquisicion||[],attrValue(attributes,'posibilidadAdquisicion','valor'));
    var aSA=statusActions(af,'Guardar medidas');
    attrsSection.appendChild(af);
    af.addEventListener('submit',function(e){
      e.preventDefault();
      var specs=[
        {tipo:'altura',key:'valorCm',cast:Number},{tipo:'peso',key:'valorKg',cast:Number},
        {tipo:'lateralidad',key:'valor'},{tipo:'genero',key:'valor'},
        {tipo:'aperturaBrazos',key:'valorCm',cast:Number},{tipo:'aperturaArco',key:'valorCm',cast:Number},
        {tipo:'librajeActual',key:'valorLbs',cast:Number},{tipo:'variacionBase',key:'valor'},
        {tipo:'posibilidadAdquisicion',key:'valor'}
      ].map(function(spec){
        var field=attrFields[spec.tipo];
        return {build:function(jobs,personaId){
          var v=field.value;if(v===null||v==='')return;
          var payload={personaId:personaId,tipo:spec.tipo,fuente:'autorreportado'};
          payload[spec.key]=spec.cast?spec.cast(v):v;
          jobs.push(as.setAttribute(payload));
        }};
      });
      saveFields(aSA.status,aSA.button,specs);
    });
    root.appendChild(attrsSection);

    /* DOCUMENTO DE IDENTIDAD */
    var docSection=document.createElement('section');var dh=document.createElement('h3');dh.textContent='Documento de identidad';docSection.appendChild(dh);
    var docHint=document.createElement('p');docHint.className='hint';docHint.textContent='Tu documento de identidad para tu registro en la escuela.';docSection.appendChild(docHint);
    var df=document.createElement('form');
    var docTipo=addField(df,'Tipo de documento','tipoDocumento','CI','text');docTipo.required=true;
    var docNumero=addField(df,'Número','numero','','text');docNumero.required=true;
    var docPais=addField(df,'País emisor','paisEmisor','','text');docPais.required=true;
    var docPrincipalLabel=document.createElement('label');docPrincipalLabel.textContent='Es documento principal';
    var docPrincipal=document.createElement('input');docPrincipal.type='checkbox';docPrincipal.name='esPrincipal';docPrincipal.checked=true;
    docPrincipalLabel.appendChild(docPrincipal);df.appendChild(docPrincipalLabel);
    var dSA=statusActions(df,'Guardar documento');
    docSection.appendChild(df);
    df.addEventListener('submit',function(e){
      e.preventDefault();
      saveFields(dSA.status,dSA.button,[{build:function(jobs,personaId){
        jobs.push(as.setAttribute({personaId:personaId,tipo:'documentoIdentidad',tipoDocumento:docTipo.value.trim(),numero:docNumero.value.trim(),paisEmisor:docPais.value.trim(),esPrincipal:docPrincipal.checked,fuente:'autorreportado'}));
      }}]);
    });
    root.appendChild(docSection);

    function fillAttrs(){
      attrFields.altura.value=attrValue(attributes,'altura','valorCm');
      attrFields.peso.value=attrValue(attributes,'peso','valorKg');
      attrFields.lateralidad.value=attrValue(attributes,'lateralidad','valor');
      attrFields.genero.value=attrValue(attributes,'genero','valor');
      attrFields.aperturaBrazos.value=attrValue(attributes,'aperturaBrazos','valorCm');
      attrFields.aperturaArco.value=attrValue(attributes,'aperturaArco','valorCm');
      attrFields.librajeActual.value=attrValue(attributes,'librajeActual','valorLbs');
      attrFields.variacionBase.value=attrValue(attributes,'variacionBase','valor');
      attrFields.posibilidadAdquisicion.value=attrValue(attributes,'posibilidadAdquisicion','valor');
      var d=currentAttribute(attributes,'documentoIdentidad')||{};
      docTipo.value=d.tipoDocumento||'CI';
      docNumero.value=d.numero||'';
      docPais.value=d.paisEmisor||'';
      docPrincipal.checked=d.esPrincipal!==false;
    }

    obtainAttrs(aSA.status);

    return root;
  };
})(window, document);