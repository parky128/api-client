/**
 *  AlLocatorService is responsible for abstracting the locations of a network of interrelated sites
 *  in different environments, regions/data residency zones, and data centers.  It is not meant to be
 *  used directly, but by a core library that exposes cross-application URL resolution in a more
 *  application-friendly way.
 *
 *  @author Kevin Nielsen <knielsen@alertlogic.com>
 *
 *  @copyright 2019 Alert Logic, Inc.
 */

/**
 * AlLocationContext defines the context in which a specific location or set of locations may exist.
 *     - environment - dev, integration, production?
 *     - residency - US or EMEA (or default)?
 *     - location - insight-us-virginia, insight-eu-ireland, defender-us-ashburn, defender-us-denver, defender-eu-newport
 *     - accessible - a list of accessible locations
 */
export interface AlLocationContext {
    environment?:string;
    residency?:string;
    location?:string;
    accessible?:string[];
}

/**
 * AlLocationType is an enumeration of different location types, each corresponding to a specific application.
 * Each type is presumed to have a single unique instance inside a given environment and residency.
 */
/* tslint:disable:variable-name */
export class AlLocation
{
    /**
     * API Stacks
     */
    public static GlobalAPI         = "global:api";
    public static InsightAPI        = "insight:api";
    public static EndpointsAPI      = "endpoints:api";

    /**
     * Modern UI Nodes
     */
    public static LegacyUI          = "cd14:ui";
    public static OverviewUI        = "cd17:overview";
    public static IntelligenceUI    = "cd17:intelligence";
    public static ConfigurationUI   = "cd17:config";
    public static RemediationsUI    = "cd17:remediations";
    public static IncidentsUI       = "cd17:incidents";
    public static AccountsUI        = "cd17:accounts";
    public static LandscapeUI       = "cd17:landscape";
    public static IntegrationsUI    = "cd17:integrations";
    public static EndpointsUI       = "cd19:endpoints";
    public static InsightBI         = "insight:bi";
    public static HudUI             = "insight:hud";
    public static IrisUI            = "insight:iris";
    public static SearchUI          = "cd17:search";

    /**
     * Miscellaneous/External Resources
     */
    public static Fino              = "cd14:fino";
    public static SecurityContent   = "cd14:scc";
    public static SupportPortal     = "cd14:support";
    public static Segment           = "segment";
    public static Auth0             = "auth0";

    /**
     * Generates location type definitions for residency-specific prod, integration, and dev versions of a UI
     */
    public static uiNode( locTypeId:string, appCode:string, devPort:number ):AlLocationDescriptor[] {
        return [
            {
                locTypeId: locTypeId,
                environment: 'production',
                residency: 'US',
                uri: `https://console.${appCode}.alertlogic.com`
            },
            {
                locTypeId: locTypeId,
                environment: 'production',
                residency: 'EMEA',
                uri: `https://console.${appCode}.alertlogic.co.uk`
            },
            {
                locTypeId: locTypeId,
                environment: 'integration',
                uri: `https://console.${appCode}.product.dev.alertlogic.com`
            },
            {
                locTypeId: locTypeId,
                environment: 'development',
                uri: `http://localhost:${devPort}`
            }
        ];
    }
}

export interface AlLocationDescriptor
{
    locTypeId:string;               //  This should correspond to one of the ALServiceIdentity string constants
    parentId?:string;               //  If the given node is a child of another node, this is the parent's ID
    locationId?:string;             //  The location ID as defined by the global locations service -- e.g., 'defender-us-ashburn' or 'insight-eu-ireland'.
    uri:string;                     //  URI of the entity
    residency?:string;              //  A data residency domain
    environment?:string;            //  'production, 'integration', 'development'...

    productType?:string;            //  'defender' or 'insight' (others perhaps in the future?)
    aspect?:string;                 //  'ui' or 'api'

    uiCaption?:string;
    uiEntryPoint?:any;
    data?:any;                      //  Miscellaneous associated data

    _fullURI?:string;               //  Fully calculated URI of the node (for caching purposes)
}

class AlLocatorMatrix
{
    nodes:{[locTypeId:string]:AlLocationDescriptor} = {};
    _nodeMap:{[hashKey:string]:AlLocationDescriptor} = {};

    /**
     *  These four properties echo the matrix's 'context' (see AlLocationContext above)
     */
    context:AlLocationContext = {
        environment:    "production",
        residency:      "US",
        location:       null,
        accessible:     null
    };

    actingUri:string = null;
    actor:AlLocationDescriptor = null;

    constructor( nodes:AlLocationDescriptor[] = [], actingUri:string|boolean = true, context:AlLocationContext = null ) {
        if ( context ) {
            this.setContext( context );
        }
        if ( nodes && nodes.length ) {
            this.setLocations( nodes );
        }
        if ( typeof( actingUri ) === 'boolean' || actingUri ) {
            this.setActingUri( actingUri );
        }
    }

    /**
     *  Updates the service matrix model with a set of service node descriptors.  Optionally
     *  calculates which node is the acting node based on its URI.
     *
     *  @param {Array} nodes A list of service node descriptors.
     *  @param {string} actingURI
     */
    public setLocations( nodes:AlLocationDescriptor[] ) {

        if ( nodes ) {
            for ( let i = 0; i < nodes.length; i++ ) {
                this.saveNode( nodes[i] );
            }
        }
    }

    public setActingUri( actingUri:string|boolean ) {
        if ( actingUri === null ) {
            this.actingUri = null;
            this.actor = null;
            return;
        }

        if ( typeof( actingUri ) === 'boolean' ) {
            if ( typeof( window ) !== 'undefined' ) {
                actingUri = window.location.origin + ( window.location.pathname && window.location.pathname.length > 1 ) ? window.location.pathname : '';
            } else {
                actingUri = "http://localhost:9999";
            }
        }
        /**
         *  This particular piece of black magic is responsible for identifying the active node by its URI
         *  and updating the ambient context to match its environment and data residency attributes.  It is
         *  opaque for a reason :)
         */
        if ( actingUri ) {
            this.actingUri = actingUri;
            this.actor = this.getNodeByURI( actingUri );
            if ( this.actor ) {
                this.setContext( {
                    environment: this.actor.environment || this.context.environment,
                    residency: this.actor.residency || this.context.residency
                } );
            }
        }
    }

    public search( filter:{(node:AlLocationDescriptor):boolean} ):AlLocationDescriptor[] {
        let results = [];
        for ( let k in this._nodeMap ) {
            if ( ! this._nodeMap.hasOwnProperty( k ) ) {
                continue;
            }
            if ( filter( this._nodeMap[k] ) ) {
                results.push( this._nodeMap[k] );
            }
        }

        return results;
    }

    public findOne( filter:{(node:AlLocationDescriptor):boolean} ):AlLocationDescriptor {
        let results = this.search( filter );
        if ( results.length === 0 ) {
            return null;
        }
        return results[0];
    }

    /**
     *  Sets the acting context (preferred environment, data residency, location attributes).
     *  This acts as a merge against existing context, so the caller can provide only fragmentary information without borking things.
     */
    public setContext( context:AlLocationContext = null ) {
        this.nodes = {};    //  flush lookup cache
        this.context.location = context && context.location ? context.location : this.context.location;
        this.context.accessible = context && context.accessible && context.accessible.length ? context.accessible : this.context.accessible;
        if ( this.context.location ) {
            let locationNode = this.findOne( n => { return n.locationId === this.context.location; } );
            if ( locationNode && locationNode.residency ) {
                this.context.residency = locationNode.residency;
            }
            //  This block defaults to setting contextual residency to match the bound location.
        }
        this.context.environment = context && context.environment ? context.environment : this.context.environment;
        this.context.residency = context && context.residency ? context.residency : this.context.residency;
    }

    public getContext():AlLocationContext {
        return this.context;
    }

    /**
     *  Gets a service node by ID, optionally using a context to refine its selection logic.  The context defaults
     *  to the service matrix instance's current context; if the default is used, the result of the lookup will be stored
     *  for performance optimization.
     *
     *  @param {string} locTypeId The ID of the service node to select.  See al-service-identity.ts for constant values.
     *  @param {AlLocationContext} context Additional context to shape the selection logic.
     *
     *  @returns {AlLocationDescriptor} A node descriptor (or null, if no node matches).
     */
    public getNode( locTypeId:string, context:AlLocationContext = null ):AlLocationDescriptor {
        if ( this.nodes.hasOwnProperty( locTypeId ) && ! context ) {
            return this.nodes[locTypeId];
        }
        let environment = context && context.environment ? context.environment : this.context.environment;
        let residency = context && context.residency ? context.residency : this.context.residency;
        let location = context && context.location ? context.location : this.context.location;
        let accessible = context && context.accessible ? context.accessible : this.context.accessible;
        let node = null;

        if ( location ) {
            if ( this._nodeMap.hasOwnProperty( `${locTypeId}-${environment}-${residency}-${location}` ) ) {
                node = this._nodeMap[`${locTypeId}-${environment}-${residency}-${location}`];
            }
        }

        if ( ! node && accessible && accessible.length ) {
            for ( let i = 0; i < accessible.length; i++ ) {
                let locationId = accessible[i];
                if ( locationId !== location ) {
                    if ( this._nodeMap.hasOwnProperty( `${locTypeId}-${environment}-${residency}-${locationId}` ) ) {
                        node = this._nodeMap[`${locTypeId}-${environment}-${residency}-${locationId}`];
                    }
                }
            }
        }
        if ( ! node && environment && residency && this._nodeMap.hasOwnProperty( `${locTypeId}-${environment}-${residency}`) ) {
            node = this._nodeMap[`${locTypeId}-${environment}-${residency}`];
        }
        if ( ! node && environment && this._nodeMap.hasOwnProperty( `${locTypeId}-${environment}-*`) ) {
            node = this._nodeMap[`${locTypeId}-${environment}-*`];
        }
        if ( ! node && this._nodeMap.hasOwnProperty( `${locTypeId}-*-*`) ) {
            node = this._nodeMap[`${locTypeId}-*-*`];
        }
        if ( node && ! context ) {
            //  Save it in a dictionary for faster lookup next time
            this.nodes[locTypeId] = node;
        }

        return node;
    }

    /**
     *  Resolves a literal URI to a service node.
     */
    public getNodeByURI( targetURI:string ):AlLocationDescriptor {
        let matchingNode = null;
        for ( let k in this._nodeMap ) {
            if ( this._nodeMap.hasOwnProperty( k ) ) {
                let candidateNode = this._nodeMap[k];
                candidateNode._fullURI = null;  //  force re-resolution of URI
                let uri = this.resolveNodeURI( candidateNode );
                if ( uri && ( uri.indexOf( targetURI ) === 0 || targetURI.indexOf( uri ) === 0 ) ) {
                    if ( matchingNode === null || matchingNode._fullURI.length < uri.length ) {
                        matchingNode = candidateNode;
                    }
                }
            }
        }
        return matchingNode;
    }

    /**
     *  Gets the currently acting node.
     */
    public getActingNode():AlLocationDescriptor {
        return this.actor;
    }

    /**
     *  Saves a node (including hash lookups).
     */
    public saveNode( node:AlLocationDescriptor ) {
        if ( node.environment && node.residency ) {
            if ( node.locationId ) {
                this._nodeMap[`${node.locTypeId}-${node.environment}-${node.residency}-${node.locationId}`] = node;
            }
            this._nodeMap[`${node.locTypeId}-${node.environment}-${node.residency}`] = node;
        }
        if ( node.environment ) {
            this._nodeMap[`${node.locTypeId}-${node.environment}-*`] = node;
        }
        this._nodeMap[`${node.locTypeId}-*-*`] = node;
    }

    /**
     *  Recursively resolves the URI of a service node.
     */
    public resolveNodeURI( node:AlLocationDescriptor, context:AlLocationContext = null ):string {
        if ( node._fullURI ) {
            return node._fullURI;
        }
        let uri = '';
        if ( node.parentId ) {
            let parentNode = this.getNode( node.parentId, context );
            uri += this.resolveNodeURI( parentNode, context );
        }
        if ( node.uri ) {
            uri += node.uri;
            if ( ! node.parentId ) {
                //  For historical reasons, some nodes (like auth0) are represented without protocols (e.g., alertlogic-integration.auth0.com instead of https://alertlogic-integration.auth0.com).
                //  For the purposes of resolving functional links, detect these protocolless domains and add the default https:// protocol to them.
                if ( uri.indexOf("http") !== 0 ) {
                    uri = "https://" + uri;
                }
            }
        }
        node._fullURI = uri;
        return uri;
    }
}

export const AlLocatorService = new AlLocatorMatrix();
