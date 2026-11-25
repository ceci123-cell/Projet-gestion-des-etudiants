const stockage = {
    lire(cle, defaut = []) {
        try {
            return JSON.parse(localStorage.getItem(cle)) ?? defaut;
        } catch {
            return defaut;
        }
    },
    enregistrer(cle, valeur) {
        localStorage.setItem(cle, JSON.stringify(valeur));
    }
};

let etudiants = stockage.lire("ga_etudiants");
let enseignants = stockage.lire("ga_enseignants");
let classes = stockage.lire("ga_classes");
let presences = stockage.lire("ga_presences");
let utilisateurs = stockage.lire("ga_utilisateurs");
let justifications = stockage.lire("ga_justifications");
let parametres = stockage.lire("ga_parametres", {
    nom: "",
    annee: "2026-2027"
});

let utilisateurConnecte = stockage.lire("ga_session", {
    nom: "Administrateur",
    role: "Administrateur"
});

let appelEnCours = [];
let toastTimer;

const $ = id => document.getElementById(id);

const sauvegarder = () => {
    stockage.enregistrer("ga_etudiants", etudiants);
    stockage.enregistrer("ga_enseignants", enseignants);
    stockage.enregistrer("ga_classes", classes);
    stockage.enregistrer("ga_presences", presences);
    stockage.enregistrer("ga_utilisateurs", utilisateurs);
    stockage.enregistrer("ga_justifications", justifications);
    stockage.enregistrer("ga_parametres", parametres);
};

function genererId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function echapper(valeur) {
    return String(valeur ?? "").replace(/[&<>"']/g, caractere => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[caractere]);
}

function notifier(message) {
    const element = $("notificationMessage");
    if (!element) return;

    element.textContent = message;
    element.classList.add("show");

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        element.classList.remove("show");
    }, 3000);
}

function dateDuJour() {
    const maintenant = new Date();
    const decalage = maintenant.getTimezoneOffset() * 60000;
    return new Date(maintenant.getTime() - decalage).toISOString().slice(0, 10);
}

function afficherDate() {
    $("dateActuelle").textContent = new Date().toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
    });

    $("dateAppel").value = dateDuJour();
}

function obtenirClasse(id) {
    return classes.find(classe => classe.id === id)?.nom || "Classe inconnue";
}

function obtenirEtudiant(id) {
    return etudiants.find(etudiant => etudiant.id === id);
}

function obtenirNomEtudiant(id) {
    const etudiant = obtenirEtudiant(id);
    return etudiant ? `${etudiant.nom} ${etudiant.prenom}` : "Étudiant supprimé";
}

function statutHTML(statut) {
    const classesStatut = {
        "Présent": "present",
        "Absent": "absent",
        "Retard": "late",
        "Justifié": "justified"
    };

    return `<span class="status ${classesStatut[statut] || ""}">${echapper(statut)}</span>`;
}

function changerPage(nomPage) {
    const page = $(nomPage);
    if (!page) return;

    document.querySelectorAll(".page").forEach(element => {
        element.classList.remove("active");
    });

    page.classList.add("active");

    document.querySelectorAll(".nav-link").forEach(bouton => {
        bouton.classList.toggle("active", bouton.dataset.page === nomPage);
    });

    const titres = {
        dashboard: "Tableau de bord",
        etudiants: "Gestion des étudiants",
        enseignants: "Gestion des enseignants",
        classes: "Gestion des classes",
        presences: "Enregistrement des présences",
        historique: "Historique des présences",
        justifications: "Justifications",
        rapports: "Rapports et statistiques",
        utilisateurs: "Comptes utilisateurs",
        parametres: "Paramètres"
    };

    $("titrePage").textContent = titres[nomPage] || "Gestion d'assiduité";

    actualiserPage(nomPage);
}

function actualiserPage(page) {
    const fonctions = {
        dashboard: actualiserTableauDeBord,
        etudiants: afficherEtudiants,
        enseignants: afficherEnseignants,
        classes: afficherClasses,
        historique: afficherHistorique,
        justifications: afficherJustifications,
        utilisateurs: afficherUtilisateurs,
        rapports: genererRapport
    };

    fonctions[page]?.();
}

function actualiserTout() {
    afficherProfil();
    remplirSelecteurs();
    actualiserTableauDeBord();
    afficherEtudiants();
    afficherEnseignants();
    afficherClasses();
    afficherHistorique();
    afficherJustifications();
    afficherUtilisateurs();
    genererRapport();
}

function afficherProfil() {
    $("nomUtilisateur").textContent = utilisateurConnecte.nom;
    $("roleUtilisateur").textContent = utilisateurConnecte.role;
    document.querySelector(".profile-avatar").textContent =
        utilisateurConnecte.nom.split(" ").map(mot => mot[0]).join("").slice(0, 2).toUpperCase();
}

function remplirSelecteurs() {
    const options = classes.map(classe =>
        `<option value="${echapper(classe.id)}">${echapper(classe.nom)}</option>`
    ).join("");

    const configurations = [
        ["classeEtudiant", "Choisir une classe"],
        ["filtreClasseEtudiant", "Toutes les classes"],
        ["classeEnseignant", "Choisir une classe"],
        ["classeAppel", "Sélectionner une classe"],
        ["filtreClasseHistorique", "Toutes les classes"],
        ["classeRapport", "Toutes les classes"]
    ];

    configurations.forEach(([id, premier]) => {
        const select = $(id);
        if (!select) return;

        const valeur = select.value;
        select.innerHTML = `<option value="">${premier}</option>${options}`;
        select.value = valeur;
    });
}

function actualiserTableauDeBord() {
    $("totalEtudiants").textContent = etudiants.length;

    const presents = presences.filter(p => p.statut === "Présent").length;
    const absents = presences.filter(p => p.statut === "Absent").length;
    const retards = presences.filter(p => p.statut === "Retard").length;

    $("totalPresents").textContent = presents;
    $("totalAbsents").textContent = absents;
    $("totalRetards").textContent = retards;

    const total = presences.filter(p =>
        ["Présent", "Absent", "Retard"].includes(p.statut)
    ).length;

    const taux = total ? Math.round((presents / total) * 100) : 0;

    $("tauxAssiduite").textContent = taux + "%";
    $("cercleAssiduite").style.background =
        `conic-gradient(var(--primary) ${taux * 3.6}deg, #e2e8f0 0deg)`;

    const dernieres = [...presences]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 7);

    $("dernieresPresences").innerHTML = dernieres.length
        ? dernieres.map(p => `
            <tr>
                <td>${echapper(obtenirNomEtudiant(p.etudiantId))}</td>
                <td>${echapper(obtenirClasse(p.classeId))}</td>
                <td>${echapper(p.date)}</td>
                <td>${statutHTML(p.statut)}</td>
            </tr>
        `).join("")
        : `<tr><td colspan="4">Aucune donnée disponible.</td></tr>`;
}

function afficherEtudiants() {
    const recherche = $("rechercheEtudiant").value.toLowerCase();
    const classe = $("filtreClasseEtudiant").value;

    const resultat = etudiants.filter(e => {
        const correspondRecherche =
            `${e.nom} ${e.prenom} ${e.matricule}`.toLowerCase().includes(recherche);

        return correspondRecherche && (!classe || e.classeId === classe);
    });

    $("listeEtudiants").innerHTML = resultat.length
        ? resultat.map(e => `
            <tr>
                <td>${echapper(e.matricule)}</td>
                <td>${echapper(e.nom)} ${echapper(e.prenom)}</td>
                <td>${echapper(e.sexe)}</td>
                <td>${echapper(obtenirClasse(e.classeId))}</td>
                <td>${echapper(e.telephone || "-")}</td>
                <td>
                    <button class="action-button" data-action="modifier-etudiant" data-id="${echapper(e.id)}">Modifier</button>
                    <button class="action-button delete" data-action="supprimer-etudiant" data-id="${echapper(e.id)}">Supprimer</button>
                </td>
            </tr>
        `).join("")
        : `<tr><td colspan="6">Aucun étudiant trouvé.</td></tr>`;
}

function reinitialiserFormulaireEtudiant() {
    $("formEtudiant").reset();
    $("idEtudiant").value = "";
    $("titreFormEtudiant").textContent = "Nouvel étudiant";
}

$("ouvrirFormEtudiant").addEventListener("click", () => {
    if (!classes.length) {
        notifier("Créez d'abord une classe.");
        return;
    }

    reinitialiserFormulaireEtudiant();
    $("formulaireEtudiant").hidden = false;
});

$("annulerEtudiant").addEventListener("click", () => {
    $("formulaireEtudiant").hidden = true;
});

$("formEtudiant").addEventListener("submit", evenement => {
    evenement.preventDefault();

    const id = $("idEtudiant").value;
    const matricule = $("matriculeEtudiant").value.trim();

    if (etudiants.some(e => e.matricule.toLowerCase() === matricule.toLowerCase() && e.id !== id)) {
        notifier("Ce matricule existe déjà.");
        return;
    }

    const donnees = {
        id: id || genererId(),
        nom: $("nomEtudiant").value.trim(),
        prenom: $("prenomEtudiant").value.trim(),
        matricule,
        sexe: $("sexeEtudiant").value,
        classeId: $("classeEtudiant").value,
        telephone: $("telephoneEtudiant").value.trim(),
        email: $("emailEtudiant").value.trim()
    };

    if (id) {
        etudiants = etudiants.map(e => e.id === id ? donnees : e);
        notifier("Étudiant modifié avec succès.");
    } else {
        etudiants.push(donnees);
        notifier("Étudiant ajouté avec succès.");
    }

    sauvegarder();
    $("formulaireEtudiant").hidden = true;
    actualiserTout();
});

$("rechercheEtudiant").addEventListener("input", afficherEtudiants);
$("filtreClasseEtudiant").addEventListener("change", afficherEtudiants);

function afficherEnseignants() {
    $("listeEnseignants").innerHTML = enseignants.length
        ? enseignants.map(e => `
            <tr>
                <td>${echapper(e.nom)}</td>
                <td>${echapper(e.email)}</td>
                <td>${echapper(e.telephone || "-")}</td>
                <td>${echapper(obtenirClasse(e.classeId))}</td>
                <td>
                    <button class="action-button" data-action="modifier-enseignant" data-id="${echapper(e.id)}">Modifier</button>
                    <button class="action-button delete" data-action="supprimer-enseignant" data-id="${echapper(e.id)}">Supprimer</button>
                </td>
            </tr>
        `).join("")
        : `<tr><td colspan="5">Aucun enseignant enregistré.</td></tr>`;
}

$("ouvrirFormEnseignant").addEventListener("click", () => {
    if (!classes.length) {
        notifier("Créez d'abord une classe.");
        return;
    }

    $("formEnseignant").reset();
    $("idEnseignant").value = "";
    $("formulaireEnseignant").hidden = false;
});

$("annulerEnseignant").addEventListener("click", () => {
    $("formulaireEnseignant").hidden = true;
});

$("formEnseignant").addEventListener("submit", evenement => {
    evenement.preventDefault();

    const id = $("idEnseignant").value;

    const donnees = {
        id: id || genererId(),
        nom: $("nomEnseignant").value.trim(),
        email: $("emailEnseignant").value.trim(),
        telephone: $("telephoneEnseignant").value.trim(),
        classeId: $("classeEnseignant").value
    };

    if (enseignants.some(e => e.email.toLowerCase() === donnees.email.toLowerCase() && e.id !== id)) {
        notifier("Cette adresse email existe déjà.");
        return;
    }

    if (id) {
        enseignants = enseignants.map(e => e.id === id ? donnees : e);
    } else {
        enseignants.push(donnees);
    }

    sauvegarder();
    $("formulaireEnseignant").hidden = true;
    actualiserTout();
    notifier("Enseignant enregistré.");
});

function afficherClasses() {
    $("listeClasses").innerHTML = classes.length
        ? classes.map(c => `
            <tr>
                <td>${echapper(c.nom)}</td>
                <td>${echapper(c.filiere)}</td>
                <td>${etudiants.filter(e => e.classeId === c.id).length}</td>
                <td>
                    <button class="action-button" data-action="modifier-classe" data-id="${echapper(c.id)}">Modifier</button>
                    <button class="action-button delete" data-action="supprimer-classe" data-id="${echapper(c.id)}">Supprimer</button>
                </td>
            </tr>
        `).join("")
        : `<tr><td colspan="4">Aucune classe enregistrée.</td></tr>`;
}

$("ouvrirFormClasse").addEventListener("click", () => {
    $("formClasse").reset();
    $("formulaireClasse").hidden = false;
    delete $("formClasse").dataset.id;
});

$("annulerClasse").addEventListener("click", () => {
    $("formulaireClasse").hidden = true;
});

$("formClasse").addEventListener("submit", evenement => {
    evenement.preventDefault();

    const id = $("formClasse").dataset.id;
    const nom = $("nomClasse").value.trim();

    if (classes.some(c => c.nom.toLowerCase() === nom.toLowerCase() && c.id !== id)) {
        notifier("Cette classe existe déjà.");
        return;
    }

    const donnees = {
        id: id || genererId(),
        nom,
        filiere: $("filiereClasse").value.trim()
    };

    if (id) {
        classes = classes.map(c => c.id === id ? donnees : c);
    } else {
        classes.push(donnees);
    }

    sauvegarder();
    $("formulaireClasse").hidden = true;
    actualiserTout();
    notifier("Classe enregistrée.");
});

function chargerAppel() {
    const classeId = $("classeAppel").value;

    if (!classeId) {
        notifier("Sélectionnez une classe.");
        return;
    }

    const liste = etudiants.filter(e => e.classeId === classeId);

    if (!liste.length) {
        notifier("Aucun étudiant dans cette classe.");
        $("listeAppel").innerHTML = `<tr><td colspan="6">Aucun étudiant inscrit.</td></tr>`;
        appelEnCours = [];
        return;
    }

    const date = $("dateAppel").value;

    if (!date) {
        notifier("Sélectionnez une date.");
        return;
    }

    appelEnCours = liste.map(e => {
        const ancienne = presences.find(p =>
            p.etudiantId === e.id &&
            p.classeId === classeId &&
            p.date === date &&
            p.matiere === $("matiereAppel").value.trim() &&
            p.heure === $("heureAppel").value
        );

        return {
            etudiantId: e.id,
            statut: ancienne?.statut || "Présent",
            motif: ancienne?.motif || ""
        };
    });

    afficherListeAppel();
}

function afficherListeAppel() {
    $("listeAppel").innerHTML = appelEnCours.map((a, index) => {
        const e = obtenirEtudiant(a.etudiantId);

        return `
            <tr>
                <td>${echapper(e.matricule)}</td>
                <td>${echapper(e.nom)} ${echapper(e.prenom)}</td>
                ${["Présent", "Absent", "Retard", "Justifié"].map(statut => `
                    <td>
                        <label>
                            <input type="radio" name="statut-${index}" value="${statut}" ${a.statut === statut ? "checked" : ""}>
                        </label>
                    </td>
                `).join("")}
            </tr>
        `;
    }).join("");
}

$("chargerEtudiantsAppel").addEventListener("click", chargerAppel);

$("toutPresent").addEventListener("click", () => {
    appelEnCours.forEach(a => a.statut = "Présent");
    afficherListeAppel();
});

$("listeAppel").addEventListener("change", evenement => {
    const cible = evenement.target;

    if (!cible.matches('input[type="radio"]')) return;

    const index = Number(cible.name.split("-")[1]);
    if (appelEnCours[index]) {
        appelEnCours[index].statut = cible.value;
    }
});

$("enregistrerAppel").addEventListener("click", () => {
    if (!appelEnCours.length) {
        notifier("Chargez d'abord la liste des étudiants.");
        return;
    }

    const classeId = $("classeAppel").value;
    const date = $("dateAppel").value;
    const heure = $("heureAppel").value;
    const matiere = $("matiereAppel").value.trim();

    if (!date || !matiere) {
        notifier("Renseignez la date et la matière.");
        return;
    }

    appelEnCours.forEach(a => {
        const existante = presences.find(p =>
            p.etudiantId === a.etudiantId &&
            p.classeId === classeId &&
            p.date === date &&
            p.heure === heure &&
            p.matiere === matiere
        );

        if (existante) {
            existante.statut = a.statut;
        } else {
            presences.push({
                id: genererId(),
                etudiantId: a.etudiantId,
                classeId,
                date,
                heure,
                matiere,
                statut: a.statut
            });
        }
    });

    sauvegarder();
    actualiserTout();
    notifier("Appel enregistré avec succès.");
    changerPage("historique");
});

function afficherHistorique() {
    const date = $("filtreDateHistorique").value;
    const classe = $("filtreClasseHistorique").value;
    const statut = $("filtreStatutHistorique").value;

    const resultat = [...presences]
        .filter(p =>
            (!date || p.date === date) &&
            (!classe || p.classeId === classe) &&
            (!statut || p.statut === statut)
        )
        .sort((a, b) => b.date.localeCompare(a.date));

    $("listeHistorique").innerHTML = resultat.length
        ? resultat.map(p => `
            <tr>
                <td>${echapper(p.date)}</td>
                <td>${echapper(obtenirNomEtudiant(p.etudiantId))}</td>
                <td>${echapper(obtenirClasse(p.classeId))}</td>
                <td>${echapper(p.matiere)}</td>
                <td>${echapper(p.heure || "-")}</td>
                <td>${statutHTML(p.statut)}</td>
            </tr>
        `).join("")
        : `<tr><td colspan="6">Aucun enregistrement trouvé.</td></tr>`;
}

["filtreDateHistorique", "filtreClasseHistorique", "filtreStatutHistorique"].forEach(id => {
    $(id).addEventListener("change", afficherHistorique);
});

function afficherJustifications() {
    const resultat = presences.filter(p =>
        p.statut === "Absent" || p.statut === "Justifié"
    );

    $("listeJustifications").innerHTML = resultat.length
        ? resultat.map(p => `
            <tr>
                <td>${echapper(obtenirNomEtudiant(p.etudiantId))}</td>
                <td>${echapper(p.date)}</td>
                <td>${echapper(p.motif || "Non renseigné")}</td>
                <td>${p.document ? `<a href="${echapper(p.document)}" target="_blank" rel="noopener">Consulter</a>` : "-"}</td>
                <td>
                    ${p.statut === "Justifié"
                        ? statutHTML("Justifié")
                        : `<button class="action-button" data-action="justifier" data-id="${echapper(p.id)}">Valider</button>
                           <button class="action-button delete" data-action="refuser" data-id="${echapper(p.id)}">Refuser</button>`
                    }
                </td>
            </tr>
        `).join("")
        : `<tr><td colspan="5">Aucune absence à traiter.</td></tr>`;
}

function genererRapport() {
    const classe = $("classeRapport").value;
    const debut = $("debutRapport").value;
    const fin = $("finRapport").value;

    const resultat = presences.filter(p =>
        (!classe || p.classeId === classe) &&
        (!debut || p.date >= debut) &&
        (!fin || p.date <= fin)
    );

    const presents = resultat.filter(p => p.statut === "Présent").length;
    const absents = resultat.filter(p => p.statut === "Absent").length;
    const retards = resultat.filter(p => p.statut === "Retard").length;
    const total = presents + absents + retards;
    const taux = total ? Math.round(presents / total * 100) : 0;

    $("rapportPresents").textContent = presents;
    $("rapportAbsents").textContent = absents;
    $("rapportRetards").textContent = retards;
    $("rapportTaux").textContent = taux + "%";

    const details = etudiants
        .filter(e => !classe || e.classeId === classe)
        .map(e => {
            const lignes = resultat.filter(p => p.etudiantId === e.id);
            const p = lignes.filter(x => x.statut === "Présent").length;
            const a = lignes.filter(x => x.statut === "Absent").length;
            const r = lignes.filter(x => x.statut === "Retard").length;
            const t = p + a + r;
            const pourcentage = t ? Math.round(p / t * 100) : 0;

            return `
                <tr>
                    <td>${echapper(e.nom)} ${echapper(e.prenom)}</td>
                    <td>${echapper(obtenirClasse(e.classeId))}</td>
                    <td>${p}</td>
                    <td>${a}</td>
                    <td>${r}</td>
                    <td>${pourcentage}%</td>
                </tr>
            `;
        });

    $("detailsRapport").innerHTML = details.length
        ? details.join("")
        : `<tr><td colspan="6">Aucune donnée disponible.</td></tr>`;
}

$("genererRapport").addEventListener("click", genererRapport);

$("imprimerRapport").addEventListener("click", () => {
    window.print();
});

function afficherUtilisateurs() {
    $("listeUtilisateurs").innerHTML = utilisateurs.length
        ? utilisateurs.map(u => `
            <tr>
                <td>${echapper(u.nom)}</td>
                <td>${echapper(u.email)}</td>
                <td>${echapper(u.role)}</td>
                <td>
                    <button class="action-button delete" data-action="supprimer-utilisateur" data-id="${echapper(u.id)}">Supprimer</button>
                </td>
            </tr>
        `).join("")
        : `<tr><td colspan="4">Aucun compte supplémentaire.</td></tr>`;
}

$("ouvrirFormUtilisateur").addEventListener("click", () => {
    $("formUtilisateur").reset();
    $("formulaireUtilisateur").hidden = false;
});

$("annulerUtilisateur").addEventListener("click", () => {
    $("formulaireUtilisateur").hidden = true;
});

$("formUtilisateur").addEventListener("submit", evenement => {
    evenement.preventDefault();

    const email = $("emailCompte").value.trim().toLowerCase();

    if (utilisateurs.some(u => u.email.toLowerCase() === email)) {
        notifier("Cette adresse email possède déjà un compte.");
        return;
    }

    utilisateurs.push({
        id: genererId(),
        nom: $("nomCompte").value.trim(),
        email,
        motDePasse: $("motDePasseCompte").value,
        role: $("roleCompte").value
    });

    sauvegarder();
    $("formulaireUtilisateur").hidden = true;
    afficherUtilisateurs();
    notifier("Compte créé avec succès.");
});

$("formParametres").addEventListener("submit", evenement => {
    evenement.preventDefault();

    parametres = {
        nom: $("nomEtablissement").value.trim(),
        annee: $("anneeAcademique").value.trim()
    };

    sauvegarder();
    notifier("Paramètres enregistrés.");
});

function chargerParametres() {
    $("nomEtablissement").value = parametres.nom;
    $("anneeAcademique").value = parametres.annee;
}

document.addEventListener("click", evenement => {
    const boutonNavigation = evenement.target.closest("[data-page]");
    if (boutonNavigation) {
        changerPage(boutonNavigation.dataset.page);
        return;
    }

    const boutonAller = evenement.target.closest("[data-go]");
    if (boutonAller) {
        changerPage(boutonAller.dataset.go);
        return;
    }

    const bouton = evenement.target.closest("[data-action]");
    if (!bouton) return;

    const { action, id } = bouton.dataset;

    if (action === "modifier-etudiant") {
        const e = obtenirEtudiant(id);
        if (!e) return;

        $("idEtudiant").value = e.id;
        $("nomEtudiant").value = e.nom;
        $("prenomEtudiant").value = e.prenom;
        $("matriculeEtudiant").value = e.matricule;
        $("sexeEtudiant").value = e.sexe;
        $("classeEtudiant").value = e.classeId;
        $("telephoneEtudiant").value = e.telephone;
        $("emailEtudiant").value = e.email;
        $("titreFormEtudiant").textContent = "Modifier un étudiant";
        $("formulaireEtudiant").hidden = false;
    }

    if (action === "supprimer-etudiant") {
        if (!confirm("Supprimer cet étudiant et son historique ?")) return;

        etudiants = etudiants.filter(e => e.id !== id);
        presences = presences.filter(p => p.etudiantId !== id);
        sauvegarder();
        actualiserTout();
        notifier("Étudiant supprimé.");
    }

    if (action === "modifier-classe") {
        const c = classes.find(c => c.id === id);
        if (!c) return;

        $("nomClasse").value = c.nom;
        $("filiereClasse").value = c.filiere;
        $("formClasse").dataset.id = id;
        $("formulaireClasse").hidden = false;
    }

    if (action === "supprimer-classe") {
        if (etudiants.some(e => e.classeId === id) || enseignants.some(e => e.classeId === id)) {
            notifier("Impossible : cette classe contient des étudiants ou enseignants.");
            return;
        }

        if (!confirm("Supprimer cette classe ?")) return;

        classes = classes.filter(c => c.id !== id);
        presences = presences.filter(p => p.classeId !== id);
        sauvegarder();
        actualiserTout();
        notifier("Classe supprimée.");
    }

    if (action === "modifier-enseignant") {
        const e = enseignants.find(e => e.id === id);
        if (!e) return;

        $("idEnseignant").value = e.id;
        $("nomEnseignant").value = e.nom;
        $("emailEnseignant").value = e.email;
        $("telephoneEnseignant").value = e.telephone;
        $("classeEnseignant").value = e.classeId;
        $("formulaireEnseignant").hidden = false;
    }

    if (action === "supprimer-enseignant") {
        if (!confirm("Supprimer cet enseignant ?")) return;

        enseignants = enseignants.filter(e => e.id !== id);
        sauvegarder();
        actualiserTout();
        notifier("Enseignant supprimé.");
    }

    if (action === "supprimer-utilisateur") {
        if (!confirm("Supprimer ce compte ?")) return;

        utilisateurs = utilisateurs.filter(u => u.id !== id);
        sauvegarder();
        afficherUtilisateurs();
        notifier("Compte supprimé.");
    }

    if (action === "justifier" || action === "refuser") {
        const presence = presences.find(p => p.id === id);
        if (!presence) return;

        if (action === "justifier") {
            const motif = prompt("Indiquez le motif de l'absence :");
            if (!motif?.trim()) return;

            presence.statut = "Justifié";
            presence.motif = motif.trim();
            justifications.push({
                id: genererId(),
                presenceId: id,
                motif: motif.trim(),
                date: presence.date
            });
        } else {
            if (!confirm("Refuser cette justification ?")) return;
            presence.statut = "Absent";
            presence.motif = "";
            justifications = justifications.filter(j => j.presenceId !== id);
        }

        sauvegarder();
        actualiserTout();
        notifier("Décision enregistrée.");
    }
});

$("deconnexion").addEventListener("click", () => {
    if (!confirm("Voulez-vous vous déconnecter ?")) return;

    utilisateurConnecte = {
        nom: "Administrateur",
        role: "Administrateur"
    };

    stockage.enregistrer("ga_session", utilisateurConnecte);
    afficherProfil();
    changerPage("dashboard");
    notifier("Session réinitialisée.");
});

function initialiserApplication() {
    afficherDate();
    chargerParametres();
    remplirSelecteurs();
    afficherProfil();
    actualiserTout();
    changerPage("dashboard");
}

initialiserApplication();