<#import "template.ftl" as layout>
<@layout.registrationLayout displayInfo=true; section>
    <#if section = "header">
        <div class="login-brand">
            <span class="brand-micro">Micro</span><span class="brand-links">Links</span>
        </div>
        <p class="login-subtitle">Réinitialisation du mot de passe</p>
    <#elseif section = "form">
        <div class="login-box">
            <#if message??>
                <div class="alert alert-${message.type}">
                    <span class="alert-icon">
                        <#if message.type = 'error'>⚠️
                        <#elseif message.type = 'success'>✅
                        <#else>ℹ️
                        </#if>
                    </span>
                    <span class="alert-text">${message.summary}</span>
                </div>
            </#if>

            <p class="reset-instructions">Entrez votre identifiant ou adresse email. Nous vous enverrons par courriel les instructions pour créer un nouveau mot de passe.</p>

            <form id="kc-reset-password-form" class="login-form" action="${url.loginAction}" method="post">
                <div class="form-group">
                    <label for="username">Identifiant ou Adresse Email</label>
                    <input type="text" id="username" name="username" class="form-control" autofocus autocomplete="off" placeholder="Saisissez votre identifiant ou email" required />
                </div>

                <button class="btn btn-primary btn-block" type="submit">
                    Envoyer les instructions
                </button>
                
                <div class="back-to-login">
                    <a href="${url.loginUrl}">← Retour à la connexion</a>
                </div>
            </form>
        </div>
    </#if>
</@layout.registrationLayout>
